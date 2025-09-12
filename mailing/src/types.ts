export interface Order {
  order_id: string;
  asset: string;
  order_type: string;
  margin: number;
  leverage: number;
  open_price: number;
  stoploss: number;
  takeprofit: number;
  close_price?: number;
  quantity: number;
  slippage: number;
  user_id: string;
  pnl: number;
}

export interface CloseOrderResp {
  status: "Success" | "Error";
  details: {
    msg: string;
    order?: Order;
  } | {
    error: string;
    details: string;
  };
}

export interface EngineResponse {
  CreateOrder?: any;
  CloseOrder?: CloseOrderResp;
  GetOrder?: any;
}

export interface OrderRes {
  res: string;
  payload: EngineResponse;
}

export interface RedisStreamMessage {
  id: string;
  data: string;
}
