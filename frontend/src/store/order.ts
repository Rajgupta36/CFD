import { create } from "zustand";
import { getOpenOrders } from "../api/api";
import type { OpenOrder } from "../type/order";

interface OpenOrderType {
  orders: OpenOrder[];
  calculate: (symbol: string, price: number) => void;
  //for open orders
  fetchOrders: () => Promise<void>;
  setOrders: (orders: OpenOrder[]) => void;
}

export const useOpenOrders = create<OpenOrderType>((set) => ({
  orders: [],
  calculate: (symbol: string, price: number) =>
    set((state) => ({
      orders: state.orders.map((order) => {
        if (order.asset.toLowerCase() !== symbol.replace("usdc", ""))
          return order;
        console.log(price);
        console.log(order.open_price, typeof order.open_price);
        const pnl =
          order.order_type === "buy"
            ? (price - order.open_price / 100) * order.quantity
            : (order.open_price - price / 100) * order.quantity;
        console.log("updated pnl", pnl);
        return {
          ...order,
          pnl,
        };
      }),
    })),
  fetchOrders: async () => {
    try {
      const orders: OpenOrder[] = await getOpenOrders();
      set({ orders: orders });
    } catch (error) {
      console.error("Failed to fetch orders:", error);
    }
  },
  setOrders: (orders: OpenOrder[]) => set({ orders }),
}));
