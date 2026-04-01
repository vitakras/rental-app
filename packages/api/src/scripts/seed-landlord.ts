import { services } from "~/container";
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
	const repo = userRepository();
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

	const createdUser = await repo.create({
		id: crypto.randomUUID(),
		email,
		globalRole: "landlord",
	});

	const loginCodeResult = await services.authService.rotateReusableLoginCode({
		id: createdUser.id,
		email: createdUser.email,
		globalRole: createdUser.globalRole,
	});

	console.log(
		JSON.stringify(
			{
				created: true,
				user: {
					id: createdUser.id,
					email: createdUser.email,
					globalRole: createdUser.globalRole,
				},
				loginCode: {
					code: loginCodeResult.code,
					expiresAt: loginCodeResult.status.expiresAt,
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
