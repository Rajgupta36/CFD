import { useEffect, useState } from 'react';
import { getClosedOrders } from '../api/api';
import { intToDecimal } from '../utils/formatter';
import type { ClosedOrder } from '../type/order';

function formatTimestamp(ts: number) {
  const date = new Date(ts);
  return date.toLocaleString();
}

export default function ClosedOrdersPanel() {
  const [closedOrders, setClosedOrders] = useState<ClosedOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchClosedOrders() {
      try {
        setLoading(true);
        const data = await getClosedOrders();
        setClosedOrders(data.closedTrades);
      } catch (err) {
        console.error('Error fetching closed orders:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchClosedOrders();
  }, []);

  return (
    <div className="bg-background rounded-xl shadow-md">
      {loading ? (
        <div className="text-gray-400">Loading...</div>
      ) : closedOrders.length === 0 ? (
        <div className="text-gray-400">No closed positions</div>
      ) : (
        <div className="max-h-64 overflow-y-auto rounded-lg border border-gray-800">
          <div className="bg-gray-800 text-gray-400 uppercase text-xs sticky top-0 z-10 p-2">
            <div className="flex items-center gap-2 text-xs font-medium">
              <div className="flex-1 min-w-[80px]">Asset</div>
              <div className="flex-1 min-w-[60px]">Type</div>
              <div className="flex-1 min-w-[60px]">Qty</div>
              <div className="flex-1 min-w-[80px]">Buy Price</div>
              <div className="flex-1 min-w-[80px]">Close Price</div>
              <div className="flex-1 min-w-[80px]">PnL</div>
              <div className="flex-1 min-w-[70px]">Leverage</div>
              <div className="flex-1 min-w-[80px]">Stoploss</div>
              <div className="flex-1 min-w-[80px]">Takeprofit</div>
              <div className="flex-1 min-w-[120px]">Opened At</div>
              <div className="flex-1 min-w-[120px]">Closed At</div>
            </div>
          </div>
          <div className="divide-y divide-gray-700">
            {closedOrders?.map((order) => (
              <div
                key={order.id}
                className="p-2 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2 text-sm">
                  <div className="flex-1 min-w-[80px] font-medium text-white truncate">
                    {order.asset}
                  </div>
                  <div
                    className={`flex-1 min-w-[60px] font-semibold truncate ${
                      order.type === 'buy'
                        ? 'text-market-green'
                        : 'text-market-red'
                    }`}
                  >
                    {order.type.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-[60px] text-gray-300 truncate">
                    {order.quantity}
                  </div>
                  <div className="flex-1 min-w-[80px] text-gray-300 truncate">
                    {intToDecimal(order.openPrice, 2, 2)}
                  </div>
                  <div className="flex-1 min-w-[80px] text-gray-300 truncate">
                    {intToDecimal(order.closePrice, 2, 2)}
                  </div>
                  <div
                    className={`flex-1 min-w-[80px] font-semibold truncate ${
                      order.pnl >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}
                  >
                    {order.pnl >= 0
                      ? `+${intToDecimal(order.pnl, 2, 2)}`
                      : intToDecimal(order.pnl, 2, 2)}
                  </div>
                  <div className="flex-1 min-w-[70px] text-gray-300 truncate">
                    {order.isLeveraged ? `${order.leverage}x` : '—'}
                  </div>
                  <div className="flex-1 min-w-[80px] text-gray-300 truncate">
                    {intToDecimal(order.stoploss, 2, 2)}
                  </div>
                  <div className="flex-1 min-w-[80px] text-gray-300 truncate">
                    {intToDecimal(order.takeprofit, 2, 2)}
                  </div>
                  <div className="flex-1 min-w-[120px] text-gray-400 text-xs truncate">
                    {formatTimestamp(order.timestamp)}
                  </div>
                  <div className="flex-1 min-w-[120px] text-gray-400 text-xs truncate">
                    {formatTimestamp(order.closeTimestamp)}
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
