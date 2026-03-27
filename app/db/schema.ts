import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const applicationsTable = sqliteTable("applications", {
  id: int().primaryKey({ autoIncrement: true }),
  status: text().notNull(),
  desiredMoveInDate: text().notNull(),
});

export const residentsTable = sqliteTable("residents", {
  id: int().primaryKey({ autoIncrement: true }),
  applicationId: int()
    .notNull()
    .references(() => applicationsTable.id),
  fullName: text().notNull(),
  isAdult: int({ mode: "boolean" }).notNull(),
});