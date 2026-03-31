import { and, eq, isNull, sql } from "drizzle-orm";
import { db as defaultDb } from "~/db";
import type { EmailLoginTokenPurpose } from "~/db/schema";
import { emailLoginTokensTable } from "~/db/schema";

type DbInstance = typeof defaultDb;

export interface EmailLoginTokenRecord {
	id: string;
	email: string;
	tokenHash: string;
	purpose: EmailLoginTokenPurpose;
	expiresAt: string;
	consumedAt: string | null;
	createdByIp: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface CreateEmailLoginTokenInput {
	id: string;
	email: string;
	tokenHash: string;
	expiresAt: string;
	createdByIp?: string | null;
}

export interface EmailLoginTokenRepository {
	create(input: CreateEmailLoginTokenInput): Promise<EmailLoginTokenRecord>;
	findActiveByEmailAndTokenHash(
		email: string,
		tokenHash: string,
		now: string,
	): Promise<EmailLoginTokenRecord | null>;
	markConsumed(id: string, consumedAt: string): Promise<void>;
}

export function emailLoginTokenRepository(
	db: DbInstance = defaultDb,
): EmailLoginTokenRepository {
	return {
		async create(input) {
			const [record] = await db
				.insert(emailLoginTokensTable)
				.values({
					id: input.id,
					email: input.email,
					tokenHash: input.tokenHash,
					purpose: "login",
					expiresAt: input.expiresAt,
					createdByIp: input.createdByIp ?? null,
				})
				.returning();

			return record;
		},

		async findActiveByEmailAndTokenHash(email, tokenHash, now) {
			const [record] = await db
				.select()
				.from(emailLoginTokensTable)
				.where(
					and(
						eq(emailLoginTokensTable.email, email),
						eq(emailLoginTokensTable.tokenHash, tokenHash),
						isNull(emailLoginTokensTable.consumedAt),
						sql`${emailLoginTokensTable.expiresAt} > ${now}`,
					),
				);

			return record ?? null;
		},

		async markConsumed(id, consumedAt) {
			await db
				.update(emailLoginTokensTable)
				.set({
					consumedAt,
					updatedAt: consumedAt,
				})
				.where(eq(emailLoginTokensTable.id, id));
		},
	};
}
