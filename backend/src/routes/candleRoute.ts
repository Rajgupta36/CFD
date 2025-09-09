import { Router } from "express";
import type { Request, Response } from "express";
import { getCandles } from "../controller/candle.js";

const candleRoute = Router();

candleRoute.get("/", async (req: Request, res: Response) => {
  const asset = String(req.query.asset);
  const duration = String(req.query.duration);
  const startTime = req.query.startTime;
  const endTime = req.query.endTime;
  const data = await getCandles(asset, duration);
  res.json({
    data: data,
  });
});

export default candleRoute;
