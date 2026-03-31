import type { UserGlobalRole } from "~/db/schema";

export interface AuthMailerSendInput {
	email: string;
	token: string;
	loginUrl: string;
	user: {
		id: string;
		email: string;
		globalRole: UserGlobalRole;
	};
}

export interface AuthMailer {
	sendLoginEmail(input: AuthMailerSendInput): Promise<void>;
}
