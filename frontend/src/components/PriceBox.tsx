import { useSymbolStore } from '../store/candle';
import { useOrderbookStore } from '../store/store';
import { data } from '../utils/constants';
import { intToDecimal } from '../utils/formatter';
export const PriceBox = () => {
  const { symbol } = useSymbolStore();
  const { tokens } = useOrderbookStore();
  const asset = data.find((p) => p.symbol === symbol);
  return (
    <div className="min-w-0">
      <div className="truncate font-semibold leading-5">
        {asset?.name}
        <span className="ml-2 text-sm font-normal text-muted-foreground">
          {Object.keys(tokens)
            .filter((o) => o === symbol.toLowerCase())
            .map((p) => {
              const tokenData = tokens[p];
              return <p>{intToDecimal(tokenData.price, 2, 2)}</p>;
            })}
        </span>
      </div>
    </div>
  );
};
