import { eq, sql } from "drizzle-orm";
import type { DbInstance } from "~/db";
import type { UserGlobalRole } from "~/db/schema";
import { usersTable } from "~/db/schema";

export interface UserRecord {
	id: string;
	email: string;
	emailVerifiedAt: string | null;
	globalRole: UserGlobalRole;
	createdAt: string;
	updatedAt: string;
}

export interface UserRepository {
	create(input: CreateUserInput): Promise<UserRecord>;
	findById(userId: string): Promise<UserRecord | null>;
	findByEmail(email: string): Promise<UserRecord | null>;
	markEmailVerified(userId: string, verifiedAt: string): Promise<void>;
}

export interface CreateUserInput {
	id: string;
	email: string;
	emailVerifiedAt?: string | null;
	globalRole?: UserGlobalRole;
}

export function userRepository(db: DbInstance): UserRepository {
	return {
		async create(input) {
			const [user] = await db
				.insert(usersTable)
				.values({
					id: input.id,
					email: input.email,
					emailVerifiedAt: input.emailVerifiedAt ?? null,
					globalRole: input.globalRole ?? "applicant",
				})
				.returning();

			return user;
		},

		async findById(userId) {
			const [user] = await db
				.select()
				.from(usersTable)
				.where(eq(usersTable.id, userId));

			return user ?? null;
		},

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
