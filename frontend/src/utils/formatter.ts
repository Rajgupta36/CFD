import type { CandlestickData, UTCTimestamp } from 'lightweight-charts';
import type { apiKlineData } from '../type/kline';

export const formatKlineData = (rawData: apiKlineData[]): CandlestickData[] => {
  return rawData.map((item) => ({
    time: Math.floor(new Date(item.time).getTime() / 1000) as UTCTimestamp,
    open: intToDecimal(item.open, 2),
    high: intToDecimal(item.high, 2),
    low: intToDecimal(item.low, 2),
    close: intToDecimal(item.close, 2),
  }));
};

export function intToDecimal(value: number, decimals = 2, fixed = 2) {
  const scale = 10 ** decimals;
  return Number((value / scale).toFixed(fixed));
}
