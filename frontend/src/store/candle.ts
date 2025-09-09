import { create } from "zustand";

interface Symbol {
  symbol: string;
  updateSymbol: (s: string) => void;
}
interface Duration {
  duration: string;
  updateDuration: (d: string) => void;
}

export const useSymbolStore = create<Symbol>((set) => ({
  symbol: "BTCUSDC",
  updateSymbol: (s) => set(() => ({ symbol: s })),
}));

export const useDurationStore = create<Duration>((set) => ({
  duration: "1m",
  updateDuration: (d) => set(() => ({ duration: d })),
}));
