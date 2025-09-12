import type { ClosedOrder } from "@prisma/client";
import { prisma } from "../manager/db.js";

export async function closeOrder(closeOrder: any) {
  try {
    const order = await prisma.closedOrder.create({
      data: {
        asset: closeOrder.asset,
        type: closeOrder.order_type.toUpperCase() === "BUY" ? "BUY" : "SELL",
        //@ts-ignore
        margin: closeOrder.margin,
        leverage: closeOrder.leverage,
        entryPrice: closeOrder.open_price,
        stoploss: closeOrder.stoploss,
        takeprofit: closeOrder.takeprofit,
        exitPrice: closeOrder.close_price,
        quantity: closeOrder.quantity,
        slippage: closeOrder.slippage,
        userId: closeOrder.user_id,
        pnl: closeOrder.pnl,
        openedAt: new Date(),
      },
    });

    console.log("storeClosedOrder: order stored");
    return;
  } catch (err) {
    console.error("storeClosedOrder error", err);
  }
}
