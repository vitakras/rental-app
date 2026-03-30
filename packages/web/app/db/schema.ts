// NOTE: Column names use camelCase here. The db client in app/db/index.ts is
// configured with `casing: "snake_case"`, so Drizzle automatically maps
// camelCase property names to snake_case column names in the database.
// Do NOT add explicit snake_case column name strings to column definitions.
import { sql } from "drizzle-orm";
import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";

const timestamps = {
	createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
	updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
};

// "primary" | "co-applicant" | "dependent" | "child"
export type ResidentRole = "primary" | "co-applicant" | "dependent" | "child";

// "employment" | "self_employment" | "other"
export type IncomeSourceType = "employment" | "self_employment" | "other";

// "pending" | "submitted" | "approved" | "rejected"
export type ApplicationStatus =
	| "pending"
	| "submitted"
	| "approved"
	| "rejected";

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

export const incomeSourcesTable = sqliteTable("income_sources", {
	id: int().primaryKey({ autoIncrement: true }),
	residentId: int()
		.notNull()
		.references(() => residentsTable.id),
	type: text().$type<IncomeSourceType>().notNull(),
	employerOrSourceName: text().notNull(),
	titleOrOccupation: text(),
	monthlyAmountCents: int().notNull(),
	startDate: text().notNull(),
	endDate: text(),
	notes: text(),
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

// "identity" | "income" | "residence" | "reference" | "other"
export type ApplicationDocumentCategory =
	| "identity"
	| "income"
	| "residence"
	| "reference"
	| "other";

// "government_id" | "paystub" | "employment_letter" | "bank_statement" | "reference_letter" | "other"
export type ApplicationDocumentType =
	| "government_id"
	| "paystub"
	| "employment_letter"
	| "bank_statement"
	| "reference_letter"
	| "other";

// "submitted" | "under_review" | "accepted" | "rejected"
export type ApplicationDocumentStatus =
	| "submitted"
	| "under_review"
	| "accepted"
	| "rejected";

// "pending_upload" | "uploaded" | "attached" | "deleted" | "upload_failed"
export type FileStatus =
	| "pending_upload"
	| "uploaded"
	| "attached"
	| "deleted"
	| "upload_failed";

export const filesTable = sqliteTable("files", {
	id: text().primaryKey(),
	storageKey: text().notNull(),
	originalFilename: text().notNull(),
	contentType: text().notNull(),
	sizeBytes: int().notNull(),
	status: text().$type<FileStatus>().notNull().default("pending_upload"),
	uploadedByUserId: text().notNull(),
	uploadedAt: text(),
	...timestamps,
});

export const applicationDocumentsTable = sqliteTable("application_documents", {
	id: int().primaryKey({ autoIncrement: true }),
	applicationId: int()
		.notNull()
		.references(() => applicationsTable.id),
	residentId: int().references(() => residentsTable.id),
	fileId: text()
		.notNull()
		.references(() => filesTable.id),
	category: text().$type<ApplicationDocumentCategory>().notNull(),
	documentType: text().$type<ApplicationDocumentType>().notNull(),
	status: text()
		.$type<ApplicationDocumentStatus>()
		.notNull()
		.default("submitted"),
	notes: text(),
	...timestamps,
});
