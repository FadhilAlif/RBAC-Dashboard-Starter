import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Load environment variables from backend/.env regardless of CWD
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();

export function getDatabaseConnectionString(): string {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  const host = process.env.DB_HOST || "localhost";
  const port = process.env.DB_PORT || "5432";
  const user = process.env.DB_USER || "postgres";
  const password = process.env.DB_PASSWORD || "";
  const name = process.env.DB_NAME || "rbac_db";
  const ssl = process.env.DB_SSL === "true" ? "?sslmode=require" : "";
  return `postgres://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${name}${ssl}`;
}

const connectionString = getDatabaseConnectionString();
const requiresSsl =
  connectionString.includes("sslmode=require") ||
  connectionString.includes("neon.tech") ||
  process.env.DB_SSL === "true";

export const queryClient = postgres(connectionString, {
  ssl: requiresSsl ? "require" : false,
  max: Number(process.env.DB_MAX_CONNECTIONS || 10),
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(queryClient, { schema });

export type DrizzleDatabase = typeof db;
