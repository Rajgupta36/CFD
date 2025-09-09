import { WebSocketServer } from "ws";
import WebsocketManager from "./wsmanager.js";
import { Redis } from "ioredis";

const wss = new WebSocketServer({ port: 8080 });
const wsManager = new WebsocketManager();

const redis = new Redis("redis://localhost:6379");
const tokens = ["btcusdc", "ethusdc", "solusdc"];
const subscribedTokens = new Set<string>();

function subscribeRedis(token: string) {
  if (!subscribedTokens.has(token)) {
    redis.subscribe(token, (err) => {
      if (err) console.error(`Failed to subscribe to ${token}:`, err);
      else {
        subscribedTokens.add(token);
        console.log(`Redis subscribed to ${token}`);
      }
    });
  }
}

redis.on("message", (channel, message) => {
  console.log("message", channel, message);
  const clients = wsManager.getWsMap(channel);
  if (clients) {
    clients.forEach((ws) => {
      if (ws.readyState === ws.OPEN) {
        ws.send(message);
      }
    });
  }
});

wss.on("connection", (ws) => {
  console.log("New client connected");

  ws.on("message", (msg) => {
    try {
      const { event, token } = JSON.parse(msg.toString());
      if (!tokens.includes(token)) {
        ws.send(JSON.stringify({ error: "Invalid token" }));
        return;
      }
      if (event === "subscribe") {
        wsManager.setWsMap(token, ws);
        subscribeRedis(token);
      }
      if (event === "unsubscribe") {
        wsManager.removeWsMap(token, ws);
        let no_conn = wsManager.getWsMap(token)?.length;
        if (no_conn === 0) {
          redis.unsubscribe(token);
        }
      }

      console.log(`client subscribe ${token}`);
    } catch (err) {
      console.log("wrong call:", msg.toString());
    }
  });

  ws.on("close", () => {
    tokens.forEach((token) => wsManager.removeWsMap(token, ws));
    console.log("client disconnected");
  });
});

console.log("ws running on ws://localhost:8080");
