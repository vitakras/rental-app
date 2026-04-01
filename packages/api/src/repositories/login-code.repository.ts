import { and, eq, isNull, sql } from "drizzle-orm";
import { db as defaultDb } from "~/db";
import { loginCodesTable } from "~/db/schema";

type DbInstance = typeof defaultDb;

export interface LoginCodeRecord {
	id: string;
	userId: string;
	codeHash: string;
	expiresAt: string;
	invalidatedAt: string | null;
	failedAttempts: number;
	successfulUses: number;
	lastUsedAt: string | null;
	createdByIp: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface CreateLoginCodeInput {
	id: string;
	userId: string;
	codeHash: string;
	expiresAt: string;
	createdByIp?: string | null;
}

export interface LoginCodeRepository {
	create(input: CreateLoginCodeInput): Promise<LoginCodeRecord>;
	findActiveByUserId(userId: string, now: string): Promise<LoginCodeRecord | null>;
	invalidateActiveByUserId(userId: string, invalidatedAt: string): Promise<void>;
	recordSuccessfulUse(id: string, usedAt: string): Promise<void>;
	recordFailedAttempt(
		id: string,
		failedAttempts: number,
		updatedAt: string,
		invalidatedAt?: string | null,
	): Promise<void>;
}

export function loginCodeRepository(
	db: DbInstance = defaultDb,
): LoginCodeRepository {
	return {
		async create(input) {
			const [record] = await db
				.insert(loginCodesTable)
				.values({
					id: input.id,
					userId: input.userId,
					codeHash: input.codeHash,
					expiresAt: input.expiresAt,
					createdByIp: input.createdByIp ?? null,
				})
				.returning();

			return record;
		},

		async findActiveByUserId(userId, now) {
			const [record] = await db
				.select()
				.from(loginCodesTable)
				.where(
					and(
						eq(loginCodesTable.userId, userId),
						isNull(loginCodesTable.invalidatedAt),
						sql`${loginCodesTable.expiresAt} > ${now}`,
					),
				)
				.orderBy(sql`${loginCodesTable.createdAt} desc`)
				.limit(1);

			return record ?? null;
		},

		async invalidateActiveByUserId(userId, invalidatedAt) {
			await db
				.update(loginCodesTable)
				.set({
					invalidatedAt,
					updatedAt: invalidatedAt,
				})
				.where(
					and(
						eq(loginCodesTable.userId, userId),
						isNull(loginCodesTable.invalidatedAt),
					),
				);
		},

		async recordSuccessfulUse(id, usedAt) {
			await db
				.update(loginCodesTable)
				.set({
					successfulUses: sql`${loginCodesTable.successfulUses} + 1`,
					failedAttempts: 0,
					lastUsedAt: usedAt,
					updatedAt: usedAt,
				})
				.where(eq(loginCodesTable.id, id));
		},

		async recordFailedAttempt(id, failedAttempts, updatedAt, invalidatedAt = null) {
			await db
				.update(loginCodesTable)
				.set({
					failedAttempts,
					invalidatedAt,
					updatedAt,
				})
				.where(eq(loginCodesTable.id, id));
		},
	};
}
