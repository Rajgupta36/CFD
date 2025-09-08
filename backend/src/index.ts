import express, { type Request, type Response } from "express";
import tradeRoute from "./routes/tradeRoute.js";
import balanceRouter from "./routes/balanceRoute.js";
import userRouter from "./routes/userRoute.js";
import { authMiddleware } from "./middleware.js";
const app = express();
app.use(express.json());

app.use("/api/v1/user", userRouter);
app.use("/api/v1/balance", authMiddleware, balanceRouter);
app.use("/api/v1/trade", authMiddleware, tradeRoute);

app.listen(3000, () => {
  console.log("server is running on poll 3000");
});
