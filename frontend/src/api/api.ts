import Cookies from "js-cookie";
export async function getKLineData(asset: string, duration: string) {
  const data = await fetch(
    `http://localhost:3000/api/v1/candles?asset=${asset.toLowerCase()}&duration=${duration}`,
  );

  return data;
}

export async function getUserBalance() {
  const data = await fetch(`http://localhost:3000/api/v1/balance`, {
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
  margin: number,
  asset: string,
  slippage: number,
  leverage: number,
  // price: number,
  // stoploss: number,
  // takeprofit: number,
) {
  const data = await fetch(`http://localhost:3000/api/v1/trade/open`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${Cookies.get("authorization")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      order_type,
      margin,
      asset: normalize(asset),
      leverage,
      slippage,
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

  const assets = ["BTC", "ETH", "SOL"];

  const responses = await Promise.all(
    assets.map(async (asset) => {
      const res = await fetch("http://localhost:3000/api/v1/trade/all", {
        method: "POST",
        headers,
        body: JSON.stringify({ asset }),
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch ${asset} orders: ${res.statusText}`);
      }

      const json = await res.json();
      return json.response?.GetOrder?.details?.orders ?? [];
    }),
  );
  console.log(responses.flat());
  return responses.flat();
}

export async function closeOrderServer(symbol: string, orderId: string) {
  const data = await fetch(`http://localhost:3000/api/v1/trade/close`, {
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
  const data = await fetch("http://localhost:3000/api/v1/trade/closed_trades", {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });

  const json = await data.json();
  return json;
}

function normalize(asset: string) {
  return asset.toUpperCase().replace("USDC", "");
}
