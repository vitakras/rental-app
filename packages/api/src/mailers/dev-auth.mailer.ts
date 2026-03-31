import type { Logger } from "~/logger";
import type { AuthMailer } from "~/mailers/auth.mailer";

export function createDevAuthMailer({
	logger,
}: {
	logger: Logger;
}): AuthMailer {
	return {
		async sendLoginEmail({ email, token, loginUrl, user }) {
			logger.info(
				{
					email,
					userId: user.id,
					globalRole: user.globalRole,
					loginUrl,
					token,
				},
				"Prepared login email",
			);
		},
	};
}
