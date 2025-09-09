"use client";
import { useEffect } from "react";
import { X } from "lucide-react";
import { useOpenOrders } from "../store/order";
import { intToDecimal } from "../utils/formatter";
import { closeOrderServer } from "../api/api";
import { useBalance } from "../store/balance";
import { toast } from "sonner";

function formatTimestamp(ts: number) {
  const date = new Date(ts);
  return date.toLocaleString();
}

async function closeOrder(
  symbol: string,
  orderId: string,
  setBalance: () => void,
  fetchOrders: () => void,
) {
  const data = await closeOrderServer(symbol, orderId);
  setBalance();
  fetchOrders();
  console.log(data.response.CloseOrder.Success.order);
  const res_orderId = data.response.CloseOrder.Success.order.order_id;
  console.log(res_orderId);
  if (res_orderId) {
    toast.success("Order closed successfully", {
      description: `Order Id : ${res_orderId}`,
      position: "top-center",
      closeButton: true,
      style: { backgroundColor: "var(--popover-foreground)" },
    });
  } else {
    toast.error("Failed to close order", {
      position: "top-center",
      closeButton: true,
      style: { backgroundColor: "var(--popover-foreground)" },
    });
  }
  console.log(data);
}

export default function OpenPositionsPanel() {
  const setBalance = useBalance((set) => set.setBalance);
  const orders = useOpenOrders((state) => state.orders);
  const fetchOrders = useOpenOrders((state) => state.fetchOrders);

  useEffect(() => {
    try {
      fetchOrders();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      console.log("error in fetching open orders");
    }
  }, [fetchOrders]);

  return (
    <div className="bg-background rounded-xl shadow-md">
      {orders.length === 0 ? (
        <div className="text-gray-400">No open positions</div>
      ) : (
        <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-800">
          <div className="bg-gray-800 text-gray-400 uppercase text-xs sticky top-0 z-10 p-2">
            <div className="flex items-center gap-2 text-xs font-medium">
              <div className="flex-1 min-w-[80px]">Asset</div>
              <div className="flex-1 min-w-[60px]">Type</div>
              <div className="flex-1 min-w-[60px]">Quantity</div>
              <div className="flex-1 min-w-[60px]">Margin</div>
              <div className="flex-1 min-w-[60px]">Leverage</div>
              <div className="flex-1 min-w-[80px]">Buy Price</div>
              <div className="flex-1 min-w-[80px]">PnL</div>
              {/*<div className="flex-1 min-w-[120px]">Opened At</div>*/}
              <div className="w-[60px]">Action</div>
            </div>
          </div>

          <div className="divide-y divide-gray-700">
            {orders.map((order) => (
              <div
                key={order.order_id}
                className="p-2 hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2 text-sm">
                  <div className="flex-1 min-w-[80px] font-medium text-white truncate">
                    {order.asset}
                  </div>
                  <div
                    className={`flex-1 min-w-[60px] font-semibold truncate ${
                      order.order_type === "buy"
                        ? "text-market-green"
                        : "text-market-red"
                    }`}
                  >
                    {order.order_type.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-[60px] text-gray-300 truncate">
                    {order.quantity.toFixed(2)}
                  </div>
                  <div className="flex-1 min-w-[60px] text-gray-300 truncate">
                    {intToDecimal(order.margin, 4, 4).toFixed(2)}
                  </div>
                  <div className="flex-1 min-w-[60px] text-gray-300 truncate">
                    {order.leverage}
                  </div>

                  <div className="flex-1 min-w-[80px] text-gray-300 truncate">
                    {intToDecimal(order.open_price, 4, 4)}
                  </div>

                  <div
                    className={`flex-1 min-w-[80px] font-semibold truncate ${
                      order.pnl >= 0 ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {order.pnl >= 0
                      ? `+${intToDecimal(order.pnl, 2, 4)}`
                      : intToDecimal(order.pnl, 2, 4)}
                  </div>
                  {/*<div className="flex-1 min-w-[120px] text-gray-400 text-xs truncate">
                    {formatTimestamp(order.timestamp)}
                  </div>*/}
                  <div className="w-[60px] flex justify-center">
                    <button
                      onClick={() => {
                        closeOrder(
                          order.asset,
                          order.order_id,
                          setBalance,
                          fetchOrders,
                        );
                      }}
                      className="p-0.5 rounded-3xl bg-red-700/100 transition-colors cursor-pointer"
                      title="Close Position"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
