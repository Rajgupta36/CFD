import { Router, type Request, type Response } from "express";
import { authMiddleware } from "../middleware.js";
import redisSubscriber from "../manager/redis.js";
import { closeOrder } from "../controller/closeTrade.js";
import { prisma } from "../manager/db.js";
const router = Router();
router.post("/open", authMiddleware, async (req: Request, res: Response) => {
  const userId = req.userId;
  const {
    order_type,
    quantity,
    asset,
    leverage,
    slippage,
    stoploss,
    takeprofit,
    is_leveraged,
  } = req.body;
  try {
    const id = await redisSubscriber.putMessage("order_create", {
      user_id: userId,
      order_type,
      quantity: quantity,
      asset,
      leverage,
      slippage,
      stoploss,
      takeprofit,
      is_leveraged,
    });
    if (id == null) {
      return res.status(403).json({
        msg: "error",
        error: "failed to dispatch data",
      });
    }
    const response: { msg: string; order_id?: string } =
      (await redisSubscriber.waitForMessage(id)) as {
        msg: string;
        order_id?: string;
      };
    res.json({ response });
  } catch (err: any) {
    res.status(408).json({ error: err.message });
  }
});

router.post("/close", authMiddleware, async (req: Request, res: Response) => {
  const userId = req.userId;
  const { order_id, asset } = req.body;
  try {
    const id = await redisSubscriber.putMessage("order_close", {
      user_id: userId,
      order_id,
      asset,
    });
    if (id == null) {
      return res.status(403).json({
        msg: "error",
        error: "failed to dispatch data",
      });
    }
    const response: { msg: string; order_id?: string } =
      (await redisSubscriber.waitForMessage(id)) as {
        msg: string;
        order_id?: string;
      };
    //@ts-ignore
    let data_to_save = response?.CloseOrder?.Success.order;
    await closeOrder(data_to_save);

    res.json({ success: true, response });
  } catch (err: any) {
    res.status(408).json({ error: err.message });
  }
});

router.post("/all", authMiddleware, async (req: Request, res: Response) => {
  const userId = req.userId;
  const { asset } = req.body;
  try {
    const id = await redisSubscriber.putMessage("get_order", {
      user_id: userId,
      asset,
    });
    if (id == null) {
      return res.status(403).json({
        msg: "error",
        error: "failed to dispatch data",
      });
    }
    const response: { msg: string; order_id?: string } =
      (await redisSubscriber.waitForMessage(id)) as {
        msg: string;
        order_id?: string;
      };

    res.json({ success: true, response });
  } catch (err: any) {
    res.status(408).json({ error: err.message });
  }
});

router.get(
  "/closeOrders",
  authMiddleware,
  async (req: Request, res: Response) => {
    const userId = req.userId;
    try {
      const orders = await prisma.closedOrder.findMany({
        where: { userId: userId! },
      });
      res.json(orders);
    } catch (err) {
      console.error("Error fetching closed orders:", err);
      res.status(400).json({ error: "Failed to fetch closed orders" });
    }
  },
);

export default router;
