import { dbpool } from "./connection.js";

import type { dbdata } from "../types/data.js";
import { tillndigit } from "../index.js";
const table = "trades";

export async function insertBulkTrade(tradeData: dbdata[]) {
  if (tradeData.length === 0) return;

  const values: any[] = [];
  const placeholders: string[] = [];

  tradeData.forEach((trade, i) => {
    const idx = i * 5;
    placeholders.push(
      `($${idx + 1}, $${idx + 2}, $${idx + 3}, $${idx + 4}, $${idx + 5})`,
    );
    values.push(
      new Date(trade.time / 1000),
      trade.symbol,
      trade.trade_id,
      tillndigit(trade.price, 2),
      tillndigit(trade.quantity, 2),
    );
  });

  const query = `
    INSERT INTO ${table} (time, symbol, trade_id, price, quantity)
    VALUES ${placeholders.join(", ")}
    ON CONFLICT (time, symbol, trade_id) DO NOTHING;
  `;

  try {
    await dbpool.query(query, values);
  } catch (err) {
    console.error("error in bulk save", err);
  }
}
