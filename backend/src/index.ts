import express, { type Request, type Response } from "express";
import tradeRoute from "./routes/tradeRoute.js";
const app = express();

app.get("/api/v1/balance/usd", async (req: Request, res: Response) => {});
app.get(" /api/v1/supportedAssets", async (req: Request, res: Response) => {});
app.get("/api/v1/balance", async (req: Request, res: Response) => {});

app.use("/api/v1/trade", tradeRoute);

app.listen(3000, () => {
  console.log("server is running on poll 3000");
});
