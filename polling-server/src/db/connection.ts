import { Pool } from "pg";

export const dbpool = new Pool({
  host: "localhost",
  port: 5432,
  user: "user",
  password: "password",
  database: "trade",
});

export const tableName = "trades";
