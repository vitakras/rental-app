import { eq } from "drizzle-orm";
import { db as defaultDb } from "~/db";
import { sessionsTable } from "~/db/schema";

type DbInstance = typeof defaultDb;

export interface SessionRecord {
	id: string;
	userId: string;
	expiresAt: string;
	lastAccessedAt: string | null;
	ipAddress: string | null;
	userAgent: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface CreateSessionInput {
	id: string;
	userId: string;
	expiresAt: string;
	lastAccessedAt?: string | null;
	ipAddress?: string | null;
	userAgent?: string | null;
}

export interface SessionRepository {
	create(input: CreateSessionInput): Promise<SessionRecord>;
	findById(id: string): Promise<SessionRecord | null>;
}

export function sessionRepository(
	db: DbInstance = defaultDb,
): SessionRepository {
	return {
		async create(input) {
			const [session] = await db
				.insert(sessionsTable)
				.values({
					id: input.id,
					userId: input.userId,
					expiresAt: input.expiresAt,
					lastAccessedAt: input.lastAccessedAt ?? null,
					ipAddress: input.ipAddress ?? null,
					userAgent: input.userAgent ?? null,
				})
				.returning();

			return session;
		},

		async findById(id) {
			const [session] = await db
				.select()
				.from(sessionsTable)
				.where(eq(sessionsTable.id, id));

			return session ?? null;
		},
	};
}
