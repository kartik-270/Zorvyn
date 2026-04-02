import "dotenv/config";

type Env = {
  DATABASE_URL: string;
  JWT_SECRET: string;
  PORT: number;
  CORS_ORIGIN: string;
};

function required(name: string): string {
  const v = process.env[name];
  if (v && v.trim().length > 0) return v;
  throw new Error(`Missing required env var: ${name}`);
}

export const env: Env = {
  DATABASE_URL:
    process.env.DATABASE_URL ??
    process.env.postgres_url ?? // keep compatibility with your existing .env key
    required("DATABASE_URL"),
  JWT_SECRET: required("JWT_SECRET"),
  PORT: Number(process.env.PORT ?? 4000),
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? "http://localhost:3000",
};

