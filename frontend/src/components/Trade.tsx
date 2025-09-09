import type React from "react";
import { useState } from "react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { useSymbolStore } from "../store/candle";
import { data } from "../utils/constants";
import { cn } from "../lib/utils";
import { PriceBox } from "./PriceBox";
import { createOrder } from "../api/api";
import { useOpenOrders } from "../store/order";
import { useBalance } from "../store/balance";
import { toast } from "sonner";

export default function OrderForm() {
  const { symbol } = useSymbolStore();
  const { balance, setBalance } = useBalance();
  const [isBuy, setIsBuy] = useState(true);
  const [leverage, setLeverage] = useState(1);
  const [margin, setmargin] = useState<number>();
  const [stoploss, setStoploss] = useState<number>();
  const [takeprofit, setTakeprofit] = useState<number>();
  const [error, setError] = useState<string>("");
  const fetchOrders = useOpenOrders((state) => state.fetchOrders);

  const asset = data.find((p) => p.symbol === symbol);

  const validateForm = () => {
    if (!margin || margin <= 0) {
      return "Margin must be greater than 0";
    }
    return "";
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError("");

    const order_type = isBuy ? "buy" : "sell";

    try {
      const data = await createOrder(
        order_type,
        margin!,
        symbol,
        1,
        leverage,
        // stoploss ? stoploss : 0,
        // takeprofit ? takeprofit : 0,
      );
      if (data?.response.CreateOrder.status == "Success") {
        toast.success("Order executed successfully", {
          description: `Order Id : ${data.response.CreateOrder.details.order_id}`,
          position: "top-center",
          closeButton: true,
          style: { backgroundColor: "var(--popover-foreground)" },
        });
        await fetchOrders();
        await setBalance();
      } else {
        toast.error(`Order Failed${data?.error ? `: ${data.error}` : ""}`, {
          position: "top-center",
          closeButton: true,
          style: { backgroundColor: "var(--popover-foreground)" },
        });
      }
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong while placing the order", {
        position: "top-center",
      });
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="w-80 min-h-[660px] mt-4 py-4 flex flex-col rounded-xl border text-card-foreground shadow-sm"
    >
      <div className="p-4 pb-2">
        <div
          className="relative grid grid-cols-2 items-center rounded-lg bg-muted p-1"
          role="tablist"
        >
          <div
            className={cn(
              "absolute inset-y-1 w-1/2 rounded-md transition-transform duration-300",
              isBuy
                ? "translate-x-0 bg-emerald-600"
                : "translate-x-full bg-market-red",
            )}
          ></div>
          <button
            type="button"
            role="tab"
            onClick={() => setIsBuy(true)}
            className={cn(
              "relative z-10 py-2 text-center font-medium rounded-md focus:outline-none",
              isBuy ? "text-white" : "text-muted-foreground",
            )}
          >
            Buy
          </button>
          <button
            type="button"
            role="tab"
            onClick={() => setIsBuy(false)}
            className={cn(
              "relative z-10 py-2 text-center font-medium rounded-md focus:outline-none",
              !isBuy ? "text-white" : "text-muted-foreground",
            )}
          >
            Sell
          </button>
        </div>

        <div className="mt-4 flex items-center gap-3">
          {asset ? (
            <>
              <div className="h-8 w-8">
                <img
                  src={asset.img || "/placeholder.svg"}
                  alt={`${asset.name} icon`}
                />
              </div>
              <PriceBox />
            </>
          ) : (
            <div className="text-sm text-muted-foreground">Select a market</div>
          )}
        </div>
      </div>

      <div className="h-px bg-border mx-4 my-2" />

      <div className="px-4 pb-4 flex-1 flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <label htmlFor="margin" className="text-sm font-medium">
            margin
          </label>
          <Input
            id="margin"
            type="number"
            value={margin}
            onChange={(e) => setmargin(Number(e.target.value))}
            placeholder="Enter margin"
            inputMode="decimal"
            className={cn(
              "w-full",
              error ? "border-red-500 focus-visible:ring-red-500" : "",
            )}
          />
          {error ? (
            <p className="text-xs text-red-500">{error}</p>
          ) : (
            <div id="margin-help" className="text-xs text-muted-foreground">
              Enter order size. <br />
              Available balance: {balance.free.toFixed(2)}
            </div>
          )}
        </div>
        <div className="flex-row flex gap-4">
          <div className="flex flex-col gap-2 flex-1">
            <label className="text-sm font-medium">Stop Loss (%)</label>
            <div className="relative">
              <Input
                type="number"
                value={stoploss ?? ""}
                onChange={(e) =>
                  setStoploss(e.target.value ? Number(e.target.value) : 0)
                }
                inputMode="decimal"
                className="w-full pr-8"
                placeholder="n"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">
                %
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-2 flex-1">
            <label className="text-sm font-medium">Take Profit (%)</label>
            <div className="relative">
              <Input
                type="number"
                value={takeprofit ?? ""}
                onChange={(e) =>
                  setTakeprofit(e.target.value ? Number(e.target.value) : 0)
                }
                inputMode="decimal"
                className="w-full pr-8"
                placeholder="n"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">
                %
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label htmlFor="leverage" className="text-sm font-medium">
              Leverage
            </label>
            <span className="text-sm font-semibold">{leverage}x</span>
          </div>
          <input
            id="leverage"
            type="range"
            min={0}
            max={100}
            step={5}
            value={leverage}
            onChange={(e) =>
              setLeverage(
                Number(e.target.value) > 0 ? Number(e.target.value) : 1,
              )
            }
            className="w-full cursor-pointer accent-blue-400"
          />
        </div>

        <div className="mt-2 rounded-lg border bg-muted/30 p-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Side</span>
            <span className="rounded-full border px-2 py-0.5 text-xs font-medium">
              {isBuy ? "buy" : "sell"}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-muted-foreground">margin</span>
            <span className="font-medium">{margin}</span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-muted-foreground">Leverage</span>
            <span className="font-medium">{leverage}x</span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-muted-foreground">Slippage</span>
            <span className="font-medium">0.1%</span>
          </div>
        </div>
      </div>
      <div className="w-full  flex justify-center items-center">
        {" "}
        <Button
          type="submit"
          disabled={!!validateForm()}
          className={cn(
            "w-72 h-11 text-base font-semibold",
            !!validateForm()
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-300 hover:bg-blue-300/50",
          )}
        >
          {isBuy ? "Place Buy Order" : "Place Sell Order"}
        </Button>
      </div>
    </form>
  );
}
