import Cookies from "js-cookie";
const ORIGIN = import.meta.env.VITE_BACKEND_URL;
export async function getKLineData(asset: string, duration: string) {
  const data = await fetch(
    `${ORIGIN}/api/v1/candles?asset=${asset.toLowerCase()}&duration=${duration}`,
  );

  return data;
}

export async function getUserBalance() {
  const data = await fetch(`${ORIGIN}/api/v1/balance`, {
    headers: {
      Authorization: `Bearer ${Cookies.get("authorization")}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  const json = await data.json();
  return json;
}

export async function createOrder(
  order_type: string,
  quantity: number,
  asset: string,
  slippage: number,
  leverage: number,
  stoploss: number,
  takeprofit: number,
  // price: number,
) {
  const data = await fetch(`${ORIGIN}/api/v1/trade/open`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${Cookies.get("authorization")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      order_type,
      quantity,
      asset: normalize(asset),
      leverage,
      slippage,
      stoploss,
      takeprofit,
      is_leveraged: leverage > 1 ? true : false,
    }),
  });

  const json = await data.json();
  return json;
}

export async function getOpenOrders() {
  const headers = {
    Authorization: `Bearer ${Cookies.get("authorization")}`,
    "Content-Type": "application/json",
  };

  let asset = "SOL";
  const res = await fetch(`${ORIGIN}/api/v1/trade/all`, {
    method: "POST",
    headers,
    body: JSON.stringify({ asset: "SOL" }),
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch ${asset} orders: ${res.statusText}`);
  }

  const json = await res.json();
  return json.response?.GetOrder?.details?.orders ?? [];
}

export async function closeOrderServer(symbol: string, orderId: string) {
  const data = await fetch(`${ORIGIN}/api/v1/trade/close`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${Cookies.get("authorization")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      order_id: orderId,
      asset: symbol,
    }),
  });

  const json = await data.json();
  return json;
}

export async function getClosedOrders() {
  const data = await fetch(`${ORIGIN}/api/v1/trade/closeOrders`, {
    headers: {
      Authorization: `Bearer ${Cookies.get("authorization")}`,
      "Content-Type": "application/json",
    },
  });

  const json = await data.json();
  return json;
}

function normalize(asset: string) {
  return asset.toUpperCase().replace("USDC", "");
}
