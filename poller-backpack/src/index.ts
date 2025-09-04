import WebSocket from "ws";
import { Redis } from "ioredis";

const redis = new Redis("redis://:password@localhost:6379");
const newdata: any = {};

const ws = new WebSocket("wss://ws.backpack.exchange");

ws.on("open", () => {
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

ws.on("message", (msg) => {
  const m = JSON.parse(msg.toString());
  console.log(m);
  //can use switch more good (optimization)
  switch (m.data.s) {
    case "SOL_USDC_PERP":
      newdata.SOL = { price: conversion(m.data.p), decimal: 4 };
      break;
    case "BTC_USDC_PERP":
      newdata.BTC = { price: conversion(m.data.p), decimal: 4 };
      break;
    case "ETH_USDC_PERP":
      newdata.ETH = { price: conversion(m.data.p), decimal: 4 };
      break;
  }
});

setInterval(() => {
  const prices: any = {};

  if (newdata.BTC) prices.BTC = { symbol: "BTC", ...newdata.BTC };
  if (newdata.ETH) prices.ETH = { symbol: "ETH", ...newdata.ETH };
  if (newdata.SOL) prices.SOL = { symbol: "SOL", ...newdata.SOL };

  redis.publish("channel-1", JSON.stringify({ price_updates: prices }));
}, 100);

function conversion(price: string): number {
  return parseFloat(price) * Math.pow(10, 4);
}
