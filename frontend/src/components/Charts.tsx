import { useEffect, useState } from 'react';
import {
  CandlestickSeries,
  Chart,
  TimeScale,
  TimeScaleFitContentTrigger,
} from 'lightweight-charts-react-components';
import type { CandlestickData } from 'lightweight-charts';
import { formatKlineData } from '../utils/formatter';
import { useDurationStore, useSymbolStore } from '../store/candle';
import { getKLineData } from '../api/api';
import { durationMap } from '../utils/constants';

const Charts = () => {
  const { symbol } = useSymbolStore();
  const { duration, updateDuration } = useDurationStore();
  const [data, setData] = useState<CandlestickData[]>([]);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const fetchData = async () => {
      try {
        const res = await getKLineData(symbol, duration);
        const data = await res.json();
        const fmdata = formatKlineData(data.data);
        setData(fmdata);
      } catch (err) {
        console.log('Error fetching Kline data:', err);
      }
    };

    fetchData();
    // eslint-disable-next-line prefer-const
    interval = setInterval(fetchData, 1000 * 60); //set interval based on the timeline

    return () => clearInterval(interval);
  }, [symbol, duration]);

  if (!data) {
    return <div>loading...</div>;
  }

  return (
    <div>
      <div className="h-12 bg-transparent flex justify-end-safe items-center">
        <div className="">
          {durationMap.map((d) => (
            <button
              className="px-3 py-1 bg-background m-2 border-2 rounded-sm"
              key={d.value}
              onClick={() => updateDuration(d.value)}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>
      <div className="border-1 rounded-xl overflow-hidden">
        <Chart
          options={{
            width: 1000,
            height: 658,
            layout: {
              background: { color: '#101820' },
              textColor: '#E6E6E6',
            },
            grid: {
              vertLines: { color: '#2d3e50', style: 1 },
              horzLines: { color: '#2d3e50', style: 1 },
            },
            timeScale: {
              timeVisible: true,
              secondsVisible: true,
              borderColor: '#3a506b',
              tickMarkFormatter: (time: number) => {
                const date = new Date((time as number) * 1000);
                return date.toLocaleTimeString('en-GB', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                });
              },
            },
          }}
        >
          <CandlestickSeries
            alwaysReplaceData
            data={data}
            options={{
              upColor: '#00b894',
              borderUpColor: '#00cec9',
              wickUpColor: '#00cec9',
              downColor: '#fd6e6e',
              borderDownColor: '#e17055',
              wickDownColor: '#e17055',
            }}
          />
          <TimeScale>
            <TimeScaleFitContentTrigger deps={[data]} />
          </TimeScale>
        </Chart>
      </div>
    </div>
  );
};

export default Charts;
