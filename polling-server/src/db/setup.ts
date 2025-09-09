import { dbpool } from './connection.js';

export const candleIntervals = [
  { name: 'candles_1m', interval: '1 minute' },
  { name: 'candles_5m', interval: '5 minutes' },
  { name: 'candles_15m', interval: '15 minutes' },
  { name: 'candles_30m', interval: '30 minutes' },
  { name: 'candles_1h', interval: '1 hour' },
  { name: 'candles_1d', interval: '1 day' },
];
const table = 'trades';

export async function setupDatabase() {
  const client = await dbpool.connect();
  console.log('Connected to PostgreSQL.');

  try {
    await client.query('CREATE EXTENSION IF NOT EXISTS timescaledb;');

    // Drop old
    for (const { name } of candleIntervals) {
      await client.query(`DROP MATERIALIZED VIEW IF EXISTS ${name} CASCADE;`);
    }
    await client.query(`DROP TABLE IF EXISTS ${table} CASCADE;`);

    // Create table
    await client.query(`
      CREATE TABLE ${table} (
        time timestamptz NOT NULL,
        symbol varchar(20) NOT NULL,
        trade_id bigint NOT NULL,
        price int NOT NULL,
        quantity int NOT NULL,
        PRIMARY KEY (time, symbol, trade_id)
      );
    `);

    await client.query(`
      SELECT create_hypertable(
        '${table}',
        'time',
        chunk_time_interval => INTERVAL '1 minute',
        if_not_exists => TRUE
      );
    `);

    // CAGGs
    for (const { name, interval } of candleIntervals) {
      await client.query(`
        CREATE MATERIALIZED VIEW ${name}
        WITH (timescaledb.continuous) AS
        SELECT
          time_bucket('${interval}', time) AS bucket,
          symbol,
          first(price, time) AS open,
          max(price) AS high,
          min(price) AS low,
          last(price, time) AS close,
          sum(quantity) AS volume
        FROM ${table}
        GROUP BY bucket, symbol;
      `);

      await client.query(`
        SELECT add_continuous_aggregate_policy('${name}',
          start_offset => INTERVAL '7 days',
          end_offset   => INTERVAL '1 minute',
          schedule_interval => INTERVAL '1 minute'
        );
      `);
    }

    console.log('Database setup completed.');
  } catch (err: any) {
    console.error('error in db setup:', err.message);
  } finally {
    client.release();
  }
}
