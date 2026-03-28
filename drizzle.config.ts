import { defineConfig } from "drizzle-kit";
import { databaseUrl } from "./app/db/config";

export default defineConfig({
  out: "./drizzle",
  schema: "./app/db/schema.ts",
  dialect: "turso",
  migrations: {
    prefix: "supabase",
  },
  dbCredentials: {
    url: databaseUrl,
  },
});
