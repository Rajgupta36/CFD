import { Pool } from "pg";

export const dbpool = new Pool({
  host: "localhost",
  port: 5432,
  user: "user",
  password: "password",
  database: "trade",
  maxLifetimeSeconds: 30,
  max: 5,
});

const intervalsMap = new Map([
  ["1m", "1 minute"],
  ["5m", "5 minutes"],
  ["15m", "15 minutes"],
  ["30m", "30 minutes"],
  ["1h", "1 hour"],
  ["1d", "1 day"],
]);

export const getCandles = async (symbol: string, duration: string) => {
  const interval = intervalsMap.get(duration);

  const query = `
    SELECT
      time_bucket($1, time) AS bucket,
      first(price, time) AS open,
      MAX(price) AS high,
      MIN(price) AS low,
      last(price, time) AS close,
      SUM(quantity) AS volume
    FROM trades
    WHERE symbol = $2
    GROUP BY bucket
    ORDER BY bucket ASC;
  `;

  const result = await dbpool.query(query, [interval, symbol]);
  //@ts-ignore
  return result.rows.map((r) => ({
    time: r.bucket,
    open: r.open,
    high: r.high,
    low: r.low,
    close: r.close,
    volume: r.volume,
  }));
};
