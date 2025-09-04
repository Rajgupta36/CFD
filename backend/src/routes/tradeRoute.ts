import { Router, type Request, type Response } from "express";
const tradeRoute = Router();

tradeRoute.post("/create", async (req: Request, res: Response) => {
  //ideally it comes from middleware
  const userId = "raj";
  const { asset, type, margin, leverage, slippage } = req.body;
  //zod validation here
});

tradeRoute.post("/close", async (req: Request, res: Response) => {
  const userId = "raj";
  const { orderId } = req.body;
  //zod validation here


  return res.status(200).

});

export default tradeRoute;
