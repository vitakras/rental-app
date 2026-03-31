import { db } from "~/db";
import { usersTable } from "~/db/schema";
import { userRepository } from "~/repositories/user.repository";

function normalizeEmail(email: string) {
	return email.trim().toLowerCase();
}

function getEmailArg() {
	const email = process.argv[2];

	if (!email?.trim()) {
		console.error("Usage: bun run seed:landlord -- landlord@example.com");
		process.exit(1);
	}

	return normalizeEmail(email);
}

async function main() {
	const email = getEmailArg();
	const repo = userRepository(db);
	const existingUser = await repo.findByEmail(email);

	if (existingUser) {
		console.log(
			JSON.stringify(
				{
					created: false,
					user: {
						id: existingUser.id,
						email: existingUser.email,
						globalRole: existingUser.globalRole,
					},
					message: "Landlord user already exists for this email.",
				},
				null,
				2,
			),
		);
		return;
	}

	const id = crypto.randomUUID();
	const [createdUser] = await db
		.insert(usersTable)
		.values({
			id,
			email,
			globalRole: "landlord",
		})
		.returning();

	console.log(
		JSON.stringify(
			{
				created: true,
				user: {
					id: createdUser.id,
					email: createdUser.email,
					globalRole: createdUser.globalRole,
				},
			},
			null,
			2,
		),
	);
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
