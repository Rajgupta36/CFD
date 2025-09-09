export type OpenOrder = {
  asset: string;
  close_price: number;
  leverage?: number;
  margin: number;
  open_price: number;
  order_id: string;
  order_type: "buy" | "sell";
  pnl: number;
  quantity: number;
  slippage: number;
  // stoploss?: number;
  // takeprofit?: number;
  // timestamp: number;
};

export type ClosedOrder = {
  asset: string;
  close_price: number;
  leverage?: number;
  margin: number;
  open_price: number;
  order_id: string;
  order_type: "buy" | "sell";
  pnl: number;
  quantity: number;
  slippage: number;
  // stoploss?: number;
  // takeprofit?: number;
  // timestamp: number;
};
