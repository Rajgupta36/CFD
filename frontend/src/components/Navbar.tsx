import { useSymbolStore } from '../store/candle';
import { data } from '../utils/constants';
import UserCard from './userCard';
export function Header() {
  const { symbol: activeSymbol, updateSymbol } = useSymbolStore();
  const handleClick = (symbol: string) => {
    updateSymbol(symbol);
  };

  return (
    <div className="border-b bg-background">
      <div className="px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold">Gambler</h1>
            <div className=" ml-10 flex items-center space-x-3">
              {data.map((item) => (
                <button
                  key={item.symbol}
                  onClick={() => handleClick(item.symbol)}
                  className={`flex items-center space-x-1 px-4 py-2 rounded text-sm font-medium transition-colors duration-200 ${
                    activeSymbol === item.symbol
                      ? 'bg-gray-200 text-black'
                      : 'text-muted-foreground'
                  }`}
                >
                  <img src={item.img} alt={item.symbol} className="w-5 h-5" />
                  <span>{item.symbol}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <UserCard />
          </div>
        </div>
      </div>
    </div>
  );
}
