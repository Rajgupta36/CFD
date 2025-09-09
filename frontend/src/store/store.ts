import { create } from 'zustand';

export type TokenData = {
  bid: number;
  ask: number;
  price: number;
  bidColor?: string;
  askColor?: string;
};

interface OrderbookStore {
  tokens: Record<string, TokenData>;
  updateToken: (token: string, bid: number, ask: number, price: number) => void;
}

export const useOrderbookStore = create<OrderbookStore>((set) => ({
  tokens: {},

  updateToken: (token, bid, ask, price) =>
    set((state) => {
      const prev = state.tokens[token];

      const bidColor = prev
        ? bid < prev.bid
          ? 'text-red-500'
          : 'text-green-500'
        : 'text-green-500';

      const askColor = prev
        ? ask < prev.ask
          ? 'text-red-500'
          : 'text-green-500'
        : 'text-green-500';

      return {
        tokens: {
          ...state.tokens,
          [token]: { bid, ask, price, bidColor, askColor },
        },
      };
    }),
}));
