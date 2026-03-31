import crypto from "node:crypto";
import pino from "pino";
import { z } from "zod";
import type { AuthConfig } from "~/auth/config";
import type { UserGlobalRole } from "~/db/schema";
import type { Logger } from "~/logger";
import type { AuthMailer } from "~/mailers/auth.mailer";
import type {
	EmailLoginTokenRepository,
} from "~/repositories/email-login-token.repository";
import type {
	SessionRecord,
	SessionRepository,
} from "~/repositories/session.repository";
import type { UserRecord, UserRepository } from "~/repositories/user.repository";

export const requestEmailLoginSchema = z.object({
	email: z.string().trim().email({ error: "Invalid email address" }),
});

export const verifyEmailLoginSchema = z.object({
	email: z.string().trim().email({ error: "Invalid email address" }),
	token: z.string().min(1, { error: "Token is required" }),
});

export type RequestEmailLoginData = z.input<typeof requestEmailLoginSchema>;
export type VerifyEmailLoginData = z.input<typeof verifyEmailLoginSchema>;

export interface AuthUser {
	id: string;
	email: string;
	globalRole: UserGlobalRole;
}

export type RequestEmailLoginResult =
	| { success: true }
	| { success: false; errors: z.ZodIssue[] };

export type VerifyEmailLoginResult =
	| { success: true; user: AuthUser; session: SessionRecord }
	| { success: false; errors: z.ZodIssue[] }
	| { success: false; reason: "invalid_or_expired_token" };

export type GetSessionUserResult =
	| { success: true; user: AuthUser; session: SessionRecord }
	| { success: false; reason: "invalid_or_expired_session" };

const noopLogger = pino({ level: "silent" });

function normalizeEmail(email: string) {
	return email.trim().toLowerCase();
}

function addSeconds(date: Date, seconds: number) {
	return new Date(date.getTime() + seconds * 1000);
}

function createOpaqueToken() {
	return crypto.randomBytes(24).toString("hex");
}

function hashToken(token: string) {
	return crypto.createHash("sha256").update(token).digest("hex");
}

function toAuthUser(user: UserRecord): AuthUser {
	return {
		id: user.id,
		email: user.email,
		globalRole: user.globalRole,
	};
}

export function createAuthService({
	userRepository,
	emailLoginTokenRepository,
	sessionRepository,
	authMailer,
	authConfig,
	logger = noopLogger,
}: {
	userRepository: UserRepository;
	emailLoginTokenRepository: EmailLoginTokenRepository;
	sessionRepository: SessionRepository;
	authMailer: AuthMailer;
	authConfig: AuthConfig;
	logger?: Logger;
}) {
	return {
		async requestEmailLogin(
			data: RequestEmailLoginData,
			{
				ipAddress,
			}: {
				ipAddress?: string | null;
			} = {},
		): Promise<RequestEmailLoginResult> {
			const parsed = requestEmailLoginSchema.safeParse(data);

			if (!parsed.success) {
				return { success: false, errors: parsed.error.issues };
			}

			const email = normalizeEmail(parsed.data.email);
			const user = await userRepository.findByEmail(email);

			if (!user) {
				logger.info({ email }, "Ignoring login request for unknown email");
				return { success: true };
			}

			const rawToken = createOpaqueToken();
			const expiresAt = addSeconds(
				new Date(),
				authConfig.loginTokenTtlSeconds,
			).toISOString();
			const tokenHash = hashToken(rawToken);

			await emailLoginTokenRepository.create({
				id: crypto.randomUUID(),
				email,
				tokenHash,
				expiresAt,
				createdByIp: ipAddress ?? null,
			});

			const loginUrl = new URL("/login/verify", authConfig.webBaseUrl);
			loginUrl.searchParams.set("email", email);
			loginUrl.searchParams.set("token", rawToken);

			await authMailer.sendLoginEmail({
				email,
				token: rawToken,
				loginUrl: loginUrl.toString(),
				user: toAuthUser(user),
			});

			logger.info({ email, userId: user.id }, "Issued email login token");
			return { success: true };
		},

		async verifyEmailLogin(
			data: VerifyEmailLoginData,
			{
				ipAddress,
				userAgent,
			}: {
				ipAddress?: string | null;
				userAgent?: string | null;
			} = {},
		): Promise<VerifyEmailLoginResult> {
			const parsed = verifyEmailLoginSchema.safeParse(data);

			if (!parsed.success) {
				return { success: false, errors: parsed.error.issues };
			}

			const email = normalizeEmail(parsed.data.email);
			const now = new Date();
			const nowIso = now.toISOString();
			const tokenHash = hashToken(parsed.data.token);

			const loginToken =
				await emailLoginTokenRepository.findActiveByEmailAndTokenHash(
					email,
					tokenHash,
					nowIso,
				);

			if (!loginToken) {
				logger.warn({ email }, "Email login verification failed");
				return { success: false, reason: "invalid_or_expired_token" };
			}

			const user = await userRepository.findByEmail(email);

			if (!user) {
				logger.warn({ email }, "Token matched but user record was not found");
				return { success: false, reason: "invalid_or_expired_token" };
			}

			await emailLoginTokenRepository.markConsumed(loginToken.id, nowIso);

			if (!user.emailVerifiedAt) {
				await userRepository.markEmailVerified(user.id, nowIso);
			}

			const session = await sessionRepository.create({
				id: crypto.randomUUID(),
				userId: user.id,
				expiresAt: addSeconds(now, authConfig.sessionTtlSeconds).toISOString(),
				lastAccessedAt: nowIso,
				ipAddress: ipAddress ?? null,
				userAgent: userAgent ?? null,
			});

			logger.info({ email, userId: user.id, sessionId: session.id }, "Created session");
			return {
				success: true,
				user: toAuthUser(user),
				session,
			};
		},

		async getSessionUser(sessionId: string): Promise<GetSessionUserResult> {
			const session = await sessionRepository.findById(sessionId);

			if (!session) {
				return { success: false, reason: "invalid_or_expired_session" };
			}

			if (new Date(session.expiresAt).getTime() <= Date.now()) {
				return { success: false, reason: "invalid_or_expired_session" };
			}

			const user = await userRepository.findById(session.userId);

			if (!user) {
				return { success: false, reason: "invalid_or_expired_session" };
			}

			return {
				success: true,
				user: toAuthUser(user),
				session,
			};
		},
	};
}
