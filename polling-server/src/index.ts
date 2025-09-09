import WebSocket from "ws";
import { Redis } from "ioredis";
import { setupDatabase } from "./db/setup.js";
import { insertBulkTrade } from "./db/insert.js";
import type { tradedata, dbdata } from "./types/data.js";
const arr: dbdata[] = [];
const newdata: any = {};
const redis = new Redis("redis://:password@localhost:6379");
async function main() {
  await setupDatabase();

  const ws = new WebSocket("wss://ws.backpack.exchange");

  ws.on("open", () => {
    console.log("ws connected");
    ws.send(
      JSON.stringify({
        method: "SUBSCRIBE",
        params: [
          "trade.SOL_USDC_PERP",
          "trade.ETH_USDC_PERP",
          "trade.BTC_USDC_PERP",
        ],
        id: 1,
      }),
    );
  });

  ws.on("message", async (data) => {
    try {
      const message = JSON.parse(data.toString());
      const trade: tradedata = message.data;
      let symbol = trade.s.toLowerCase().replace("_perp", "").replace("_", "");
      console.log(symbol);
      const channel = symbol;
      console.log("trade id", trade.t, "trade time", trade.E);
      arr.push({
        time: trade.E,
        symbol: symbol,
        trade_id: trade.t,
        price: trade.p,
        quantity: trade.q,
        T: trade.T,
      });

      redis.publish(
        channel,
        JSON.stringify({
          time: trade.E,
          symbol: symbol,
          trade_id: trade.t,
          price: tillndigit(trade.p, 2),
          quantity: tillndigit(trade.q, 2),
          T: trade.T,
          bid: tillndigit(String(parseFloat(trade.p) * 1.005), 2),
          ask: tillndigit(String(parseFloat(trade.p)), 2),
        }),
      );
      switch (trade.s) {
        case "SOL_USDC_PERP":
          newdata.SOL = { price: conversion(trade.p), decimal: 4 };
          break;
        case "BTC_USDC_PERP":
          newdata.BTC = { price: conversion(trade.p), decimal: 4 };
          break;
        case "ETH_USDC_PERP":
          newdata.ETH = { price: conversion(trade.p), decimal: 4 };
          break;
      }
      if (arr.length === 500) {
        await insertBulkTrade(arr);
        arr.splice(0, 500);
      }
    } catch (err) {
      console.log("error", err);
    }
  });

  ws.on("close", () => console.log("ws closed"));
  ws.on("error", (err) => console.log("ws error:", err));
}

main();

setInterval(async () => {
  const prices: any = {};

  if (newdata.BTC) prices.BTC = { symbol: "BTC", ...newdata.BTC };
  if (newdata.ETH) prices.ETH = { symbol: "ETH", ...newdata.ETH };
  if (newdata.SOL) prices.SOL = { symbol: "SOL", ...newdata.SOL };

  await redis.xadd("channel-1", "*", "price_updates", JSON.stringify(prices));
}, 100);

function conversion(price: string): number {
  return parseFloat(price) * Math.pow(10, 4);
}

export function tillndigit(num: string | number, precision = 2): number {
  const factor = Math.pow(10, precision);
  return Math.round(Number(num) * factor);
}
