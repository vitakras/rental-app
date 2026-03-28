import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

const timestamps = {
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(current_timestamp)`),
};

// "primary" | "co-applicant" | "dependent" | "child"
export type ResidentRole = "primary" | "co-applicant" | "dependent" | "child";

// "pending" | "submitted" | "approved" | "rejected"
export type ApplicationStatus = "pending" | "submitted" | "approved" | "rejected";

export const applicationsTable = sqliteTable("applications", {
  id: int().primaryKey({ autoIncrement: true }),
  status: text().$type<ApplicationStatus>().notNull().default("pending"),
  desiredMoveInDate: text().notNull(),
  smokes: int({ mode: "boolean" }).notNull().default(false),
  ...timestamps,
});

export const residentsTable = sqliteTable("residents", {
  id: int().primaryKey({ autoIncrement: true }),
  applicationId: int()
    .notNull()
    .references(() => applicationsTable.id),
  role: text().$type<ResidentRole>().notNull(),
  fullName: text().notNull(),
  dateOfBirth: text().notNull(),
  email: text(),
  phone: text(),
  ...timestamps,
});

export const petsTable = sqliteTable("pets", {
  id: int().primaryKey({ autoIncrement: true }),
  applicationId: int()
    .notNull()
    .references(() => applicationsTable.id),
  name: text(),
  type: text().notNull(),
  breed: text(),
  notes: text(),
  ...timestamps,
});
