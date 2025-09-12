import { PrismaClient } from "@prisma/client";
import { Order } from "./types.js";

class Database {
  private static instance: PrismaClient;

  private constructor() {}

  public static getClient() {
    if (!Database.instance) {
      Database.instance = new PrismaClient();
    }
    return Database.instance;
  }
}

export const prisma = Database.getClient();

export async function saveClosedTrade(order: Order): Promise<boolean> {
  try {
    // First, ensure the asset exists
    let asset = await prisma.asset.findUnique({
      where: { symbol: order.asset }
    });

    if (!asset) {
      asset = await prisma.asset.create({
        data: {
          symbol: order.asset,
          name: order.asset,
          decimals: 8, // Default decimals for crypto
        }
      });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: order.user_id }
    });

    if (!user) {
      console.log(`User ${order.user_id} not found, skipping trade save`);
      return false;
    }

    // Calculate entry price from margin and quantity
    const entryPrice = order.open_price / Math.pow(10, 8); // Assuming 8 decimal places
    const exitPrice = (order.close_price || 0) / Math.pow(10, 8);
    const quantity = order.quantity / Math.pow(10, 8);
    const pnl = order.pnl / Math.pow(10, 8);

    // Save the closed trade
    await prisma.closedOrder.create({
      data: {
        userId: order.user_id,
        assetId: asset.id,
        type: order.order_type.toUpperCase() === "BUY" ? "BUY" : "SELL",
        quantity: quantity,
        leverage: order.leverage,
        entryPrice: entryPrice,
        exitPrice: exitPrice,
        pnl: pnl,
        openedAt: new Date(Date.now() - 60000), // Assume opened 1 minute ago for now
        closedAt: new Date(),
      }
    });

    console.log(`Saved closed trade for user ${order.user_id}, order ${order.order_id}`);
    return true;
  } catch (error) {
    console.error("Error saving closed trade:", error);
    return false;
  }
}
