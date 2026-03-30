import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { databaseUrl } from "./config";

const client = createClient({ url: databaseUrl });

export const db = drizzle(client, { casing: "snake_case" });
