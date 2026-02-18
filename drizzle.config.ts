import { defineConfig } from "drizzle-kit";

// Use NEON_DB_URL first (external Neon), then DATABASE_URL as fallback
const databaseUrl = process.env.NEON_DB_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("Set NEON_DB_URL or DATABASE_URL to your Neon connection string");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
});
