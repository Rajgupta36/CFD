export type tradedata = {
  e: string;
  E: number; //event time
  s: string;
  t: number; //tradeId
  p: string;
  q: string;
  T: number; //completed trade time
  m: boolean;
  M: boolean;
};

export type dbdata = {
  time: number;
  symbol: string;
  trade_id: number;
  price: string;
  quantity: string;
  T: number;
};
