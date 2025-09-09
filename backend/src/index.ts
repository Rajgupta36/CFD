import express, { type Request, type Response } from "express";
import cors from "cors";
import tradeRoute from "./routes/tradeRoute.js";
import balanceRouter from "./routes/balanceRoute.js";
import userRouter from "./routes/userRoute.js";
import { authMiddleware } from "./middleware.js";
import candleRoute from "./routes/candleRoute.js";
const app = express();
app.use(express.json());
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  }),
);
app.use("/api/v1/user", userRouter);
app.use("/api/v1/balance", authMiddleware, balanceRouter);
app.use("/api/v1/trade", authMiddleware, tradeRoute);
app.use("/api/v1/candles", candleRoute);

app.listen(3000, () => {
  console.log("server is running on poll 3000");
});
