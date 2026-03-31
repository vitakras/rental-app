import { eq, sql } from "drizzle-orm";
import { db as defaultDb } from "~/db";
import type { UserGlobalRole } from "~/db/schema";
import { usersTable } from "~/db/schema";

type DbInstance = typeof defaultDb;

export interface UserRecord {
	id: string;
	email: string;
	emailVerifiedAt: string | null;
	globalRole: UserGlobalRole;
	createdAt: string;
	updatedAt: string;
}

export interface UserRepository {
	findByEmail(email: string): Promise<UserRecord | null>;
	markEmailVerified(userId: string, verifiedAt: string): Promise<void>;
}

export function userRepository(db: DbInstance = defaultDb): UserRepository {
	return {
		async findByEmail(email) {
			const [user] = await db
				.select()
				.from(usersTable)
				.where(sql`lower(${usersTable.email}) = ${email}`);

			return user ?? null;
		},

		async markEmailVerified(userId, verifiedAt) {
			await db
				.update(usersTable)
				.set({
					emailVerifiedAt: verifiedAt,
					updatedAt: verifiedAt,
				})
				.where(eq(usersTable.id, userId));
		},
	};
}
