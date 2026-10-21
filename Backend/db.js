import pg from "pg";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

dotenv.config({
  path: fileURLToPath(new URL("./.env", import.meta.url)),
  quiet: true,
});

const { Pool } = pg;

const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: true },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

db.on("error", (err) => {
  console.error("Unexpected PostgreSQL pool error:", err.message);
});

export default db;
