import { Router, type Request, type Response } from "express";
import redisSubscriber from "../manager/redis.js";
const router = Router();

router.post("/", async (req: Request, res: Response) => {
  const id = await redisSubscriber.putMessage("balance_get_usd", {
    user_id: req.userId,
  });
  if (id == null) {
    return res.status(403).json({
      msg: "error",
      error: "failed to dispatch data",
    });
  }
  const response: { usd: string } = (await redisSubscriber.waitForMessage(
    id,
  )) as { usd: string };

  return res.status(200).json({
    balance: `${response.usd}`,
  });
});

router.post("/all", async (req: Request, res: Response) => {
  const id = await redisSubscriber.putMessage("balance_get_all", {
    user_id: req.userId,
  });
  if (id == null) {
    return res.status(403).json({
      msg: "error",
      error: "failed to dispatch data",
    });
  }
  const response = await redisSubscriber.waitForMessage(id);
  res.status(200).json({
    res: response,
  });
});

export default router;
