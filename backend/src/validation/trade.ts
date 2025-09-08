import * as z from "zod";

export const trade = z.object({
  asset: z.string(),
  type: z.enum(["put", "short"]),
  margin: z.number(),
  leverage: z.number(),
  slippage: z.number(),
});
