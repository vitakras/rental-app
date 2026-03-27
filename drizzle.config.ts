import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  out: './drizzle',
  schema: './app/db/schema.ts',
  dialect: 'sqlite',
  migrations: {
    prefix: 'supabase',
  },
  dbCredentials: {
    url: process.env.DB_FILE_NAME!,
  },
});