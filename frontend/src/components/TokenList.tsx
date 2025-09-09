import { useEffect } from "react";
import { intToDecimal } from "../utils/formatter";
import { useOrderbookStore } from "../store/store";
import { data } from "../utils/constants";
import { useSymbolStore } from "../store/candle";
import { useOpenOrders } from "../store/order";

const TOKENS = ["btcusdc", "ethusdc", "solusdc"];

export default function TokenList() {
  const tokens = useOrderbookStore((s) => s.tokens);
  const { updateSymbol } = useSymbolStore();
  const handleClick = (symbol: string) => {
    updateSymbol(symbol);
  };

  const updateToken = useOrderbookStore((s) => s.updateToken);
  const { calculate } = useOpenOrders();
  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8080");

    ws.onopen = () => {
      TOKENS.forEach((token) =>
        ws.send(JSON.stringify({ event: "subscribe", token })),
      );
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        const symbol = msg.symbol.toLowerCase();

        updateToken(symbol, msg.bid, msg.ask, msg.price);
        calculate(symbol, msg.price);
      } catch {
        console.error("Invalid WS data:", event.data);
      }
    };

    return () => ws.close();
  }, [updateToken]);

  return (
    <div className="min-h-[660px] w-108 rounded-lg mt-4 border bg-background/50 text-card-foreground ">
      <header className="flex items-center justify-between px-4 py-3 border-b bg-background/50">
        <h2 className="text-sm font-medium tracking-wide uppercase text-muted-foreground text-balance">
          Markets
        </h2>
        <div className="flex items-center gap-2 text-xs text-muted-foreground"></div>
      </header>

      <div className="grid grid-cols-12 items-center px-4 py-2 text-xs font-semibold uppercase text-muted-foreground border-b bg-background/50">
        <div className="col-span-6">Token</div>
        <div className="col-span-3 text-right">Bid</div>
        <div className="col-span-3 text-right">Ask</div>
      </div>

      <ul role="list" className="divide-y">
        {data.map((t) => {
          const sym = t.symbol.toLowerCase();
          const q = tokens[sym] || { bid: 0, ask: 0 };
          return (
            <li
              key={t.symbol}
              className="grid grid-cols-12 gap-8 items-center px-4 py-3 bg-background/50 hover:bg-muted/50 transition-colors cursor-pointer"
              onClick={() => handleClick(t.symbol)}
            >
              <div className="col-span-6 flex items-center gap-6">
                <img
                  src={
                    t.img ||
                    "/placeholder.svg?height=32&width=32&query=token%20logo%20placeholder"
                  }
                  alt={`${t.name} logo`}
                  width={32}
                  height={32}
                  className="h-8 w-8 rounded-full ring-1 ring-border object-contain"
                />
                <div className="flex flex-col">
                  <span className="text-sm font-medium leading-6">
                    {t.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {t.symbol}
                  </span>
                </div>
              </div>

              <div className="col-span-3">
                <div className="flex flex-col items-end">
                  <span
                    className={`text-sm font-medium leading-6 tabular-nums ${q.bidColor || "text-green-500"}`}
                  >
                    {intToDecimal(q.bid, 2)}
                  </span>
                </div>
              </div>
              <div className="col-span-3">
                <div className="flex flex-col items-end">
                  <span
                    className={`text-sm font-medium leading-6 tabular-nums ${q.askColor || "text-green-500"}`}
                  >
                    {intToDecimal(q.ask)}
                  </span>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
