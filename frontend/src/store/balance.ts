import { create } from "zustand";
import { getUserBalance } from "../api/api";
import type { balanceType } from "../type/balance";

interface balanceStateType {
  balance: balanceType;
  updateBalance: (price: number) => void;
  setBalance: () => Promise<void>;
}

export const useBalance = create<balanceStateType>((set) => ({
  balance: {
    balance: 0,
    margin: 0,
    free: 0,
  },
  updateBalance: (price: number) => {
    set((state) => ({
      balance: {
        ...state.balance,
        balance: state.balance.balance + price,
        margin: state.balance.margin + price,
        free: state.balance.free + price,
      },
    }));
  },

  setBalance: async () => {
    try {
      const data = await getUserBalance();
      set((state) => ({
        balance: {
          ...state.balance,
          balance: data.balance,
        },
      }));
    } catch (err) {
      console.log("Failed to fetch user balance:", err);
    }
  },
}));
