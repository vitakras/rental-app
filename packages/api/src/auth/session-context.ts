import type { Context } from "hono";
import type { SessionRecord } from "~/repositories/session.repository";
import type { AuthUser } from "~/services/auth.service";

export interface AuthenticatedRequestContext {
	sessionId: string;
	user: AuthUser;
	session: SessionRecord;
}

export interface AuthContextVariables {
	auth: AuthenticatedRequestContext;
}

export type AuthContextEnv = {
	Variables: AuthContextVariables;
};

export function setAuthContext(
	c: Context<AuthContextEnv>,
	auth: AuthenticatedRequestContext,
) {
	c.set("auth", auth);
}

export function getAuthContext(c: Context<AuthContextEnv>) {
	return c.get("auth");
}
