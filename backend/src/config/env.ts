import path from "node:path";
import dotenv from "dotenv";
import { z } from "zod";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    PORT: z.string().default("3001"),
    FRONTEND_URL: z.string().default("http://localhost:3000"),

    DATABASE_URL: z.string().optional(),
    DB_HOST: z.string().default("localhost"),
    DB_PORT: z.coerce.number().default(5432),
    DB_NAME: z.string().default("rbac_db"),
    DB_USER: z.string().default("postgres"),
    DB_PASSWORD: z.string().default("postgres"),
    DB_SSL: z.string().default("false"),
    DB_MAX_CONNECTIONS: z.coerce.number().default(10),

    JWT_ACCESS_SECRET: z.string().min(32),
    JWT_REFRESH_SECRET: z.string().min(32),
    JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
    JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),

    RESEND_API_KEY: z.string().optional().default(""),
    RESEND_FROM: z.string().default("onboarding@resend.dev"),
    EMAIL_FROM: z.string().optional(),
    APP_NAME: z.string().default("RBAC App"),
  });

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error("❌ Invalid environment variables:");
  for (const issue of result.error.issues) {
    console.error(`  ${issue.path.join(".")}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = result.data;
export type Env = typeof env;
