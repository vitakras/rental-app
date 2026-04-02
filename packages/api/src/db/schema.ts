// NOTE: Column names use camelCase here. The db client in app/db/index.ts is
// configured with `casing: "snake_case"`, so Drizzle automatically maps
// camelCase property names to snake_case column names in the database.
// Do NOT add explicit snake_case column name strings to column definitions.
import { sql } from "drizzle-orm";
import {
	index,
	int,
	sqliteTable,
	text,
	uniqueIndex,
} from "drizzle-orm/sqlite-core";

const timestamps = {
	createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
	updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
};

// "primary" | "co-applicant" | "dependent" | "child"
export type ResidentRole = "primary" | "co-applicant" | "dependent" | "child";

// "employment" | "self_employment" | "other"
export type IncomeSourceType = "employment" | "self_employment" | "other";

// "draft" | "pending" | "submitted" | "approved" | "rejected"
export type ApplicationStatus =
	| "draft"
	| "pending"
	| "submitted"
	| "approved"
	| "rejected";

export type UserGlobalRole = "landlord" | "applicant";

export type ApplicationAccessRole =
	| "primary_applicant"
	| "co_applicant"
	| "landlord_viewer";

export const usersTable = sqliteTable(
	"users",
	{
		id: text().primaryKey(),
		email: text().notNull(),
		emailVerifiedAt: text(),
		globalRole: text().$type<UserGlobalRole>().notNull().default("applicant"),
		...timestamps,
	},
	(table) => [uniqueIndex("users_email_unique_idx").on(table.email)],
);

export const sessionsTable = sqliteTable(
	"sessions",
	{
		id: text().primaryKey(),
		userId: text()
			.notNull()
			.references(() => usersTable.id),
		expiresAt: text().notNull(),
		lastAccessedAt: text(),
		ipAddress: text(),
		userAgent: text(),
		...timestamps,
	},
	(table) => [
		index("sessions_user_id_idx").on(table.userId),
		index("sessions_expires_at_idx").on(table.expiresAt),
	],
);

export const loginCodesTable = sqliteTable(
	"login_codes",
	{
		id: text().primaryKey(),
		userId: text()
			.notNull()
			.references(() => usersTable.id),
		codeHash: text().notNull(),
		expiresAt: text().notNull(),
		invalidatedAt: text(),
		failedAttempts: int().notNull().default(0),
		successfulUses: int().notNull().default(0),
		lastUsedAt: text(),
		createdByIp: text(),
		...timestamps,
	},
	(table) => [
		index("login_codes_user_id_idx").on(table.userId),
		index("login_codes_expires_at_idx").on(table.expiresAt),
		index("login_codes_invalidated_at_idx").on(table.invalidatedAt),
		uniqueIndex("login_codes_code_hash_unique_idx").on(table.codeHash),
	],
);

export const applicationsTable = sqliteTable("applications", {
	id: int().primaryKey({ autoIncrement: true }),
	status: text().$type<ApplicationStatus>().notNull().default("draft"),
	desiredMoveInDate: text(),
	smokes: int({ mode: "boolean" }).notNull().default(false),
	notes: text(),
	createdByUserId: text().references(() => usersTable.id),
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

export const residencesTable = sqliteTable("residences", {
	id: int().primaryKey({ autoIncrement: true }),
	applicationId: int()
		.notNull()
		.references(() => applicationsTable.id),
	residentId: int()
		.notNull()
		.references(() => residentsTable.id),
	address: text().notNull(),
	fromDate: text().notNull(),
	toDate: text(),
	reasonForLeaving: text(),
	isRental: int({ mode: "boolean" }).notNull().default(false),
	landlordName: text(),
	landlordPhone: text(),
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

export const applicationAccessTable = sqliteTable(
	"application_access",
	{
		id: int().primaryKey({ autoIncrement: true }),
		applicationId: int()
			.notNull()
			.references(() => applicationsTable.id),
		userId: text()
			.notNull()
			.references(() => usersTable.id),
		residentId: int().references(() => residentsTable.id),
		accessRole: text().$type<ApplicationAccessRole>().notNull(),
		...timestamps,
	},
	(table) => [
		index("application_access_application_id_idx").on(table.applicationId),
		index("application_access_user_id_idx").on(table.userId),
		uniqueIndex("application_access_application_user_unique_idx").on(
			table.applicationId,
			table.userId,
		),
		uniqueIndex("application_access_resident_id_unique_idx").on(
			table.residentId,
		),
	],
);
