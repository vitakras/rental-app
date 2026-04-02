import crypto from "node:crypto";
import pino from "pino";
import { z } from "zod";
import type { AuthConfig } from "~/auth/config";
import type { UserGlobalRole } from "~/db/schema";
import type { Logger } from "~/logger";
import type {
	LoginCodeRecord,
	LoginCodeRepository,
} from "~/repositories/login-code.repository";
import type {
	SessionRecord,
	SessionRepository,
} from "~/repositories/session.repository";
import type {
	UserRecord,
	UserRepository,
} from "~/repositories/user.repository";

export const verifyReusableLoginCodeSchema = z.object({
	email: z.string().trim().email({ error: "Invalid email address" }),
	code: z
		.string()
		.trim()
		.regex(/^\d{6}$/, { error: "Code must be a 6-digit number" }),
});

export const applicantSignupSchema = z.object({
	email: z.string().trim().email({ error: "Invalid email address" }),
	signupToken: z.uuid({ error: "Signup token must be a valid UUID" }),
});

export type VerifyReusableLoginCodeData = z.input<
	typeof verifyReusableLoginCodeSchema
>;
export type ApplicantSignupData = z.input<typeof applicantSignupSchema>;

export interface AuthUser {
	id: string;
	email: string;
	globalRole: UserGlobalRole;
}

export interface ReusableLoginCodeStatus {
	expiresAt: string;
	failedAttempts: number;
	successfulUses: number;
	lastUsedAt: string | null;
}

export type VerifyReusableLoginCodeResult =
	| { success: true; user: AuthUser; session: SessionRecord }
	| { success: false; errors: z.ZodIssue[] }
	| { success: false; reason: "invalid_or_expired_code" };

export type ApplicantSignupResult =
	| { success: true; user: AuthUser; session: SessionRecord }
	| { success: false; errors: z.ZodIssue[] }
	| { success: false; reason: "invalid_signup_token" | "email_already_exists" };

export interface ApplicantSignupLink {
	signupToken: string;
	signupUrl: string;
}

export type GetSessionUserResult =
	| { success: true; user: AuthUser; session: SessionRecord }
	| { success: false; reason: "invalid_or_expired_session" };

export type RotateReusableLoginCodeResult = {
	success: true;
	code: string;
	status: ReusableLoginCodeStatus;
};

export type GetReusableLoginCodeStatusResult = {
	success: true;
	status: ReusableLoginCodeStatus | null;
};

const noopLogger = pino({ level: "silent" });

function normalizeEmail(email: string) {
	return email.trim().toLowerCase();
}

function addSeconds(date: Date, seconds: number) {
	return new Date(date.getTime() + seconds * 1000);
}

function createSixDigitCode() {
	return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
}

function hashLoginCode(code: string, pepper: string) {
	return crypto.createHmac("sha256", pepper).update(code).digest("hex");
}

function toReusableLoginCodeStatus(
	code: LoginCodeRecord,
): ReusableLoginCodeStatus {
	return {
		expiresAt: code.expiresAt,
		failedAttempts: code.failedAttempts,
		successfulUses: code.successfulUses,
		lastUsedAt: code.lastUsedAt,
	};
}

function toAuthUser(user: UserRecord): AuthUser {
	return {
		id: user.id,
		email: user.email,
		globalRole: user.globalRole,
	};
}

function createApplicantSignupLink(
	authConfig: AuthConfig,
): ApplicantSignupLink {
	const signupUrl = new URL("/signup", authConfig.webBaseUrl);
	signupUrl.searchParams.set("token", authConfig.applicantSignupToken);

	return {
		signupToken: authConfig.applicantSignupToken,
		signupUrl: signupUrl.toString(),
	};
}

export function createAuthService({
	userRepository,
	loginCodeRepository,
	sessionRepository,
	authConfig,
	logger = noopLogger,
}: {
	userRepository: UserRepository;
	loginCodeRepository: LoginCodeRepository;
	sessionRepository: SessionRepository;
	authConfig: AuthConfig;
	logger?: Logger;
}) {
	return {
		async verifyReusableLoginCode(
			data: VerifyReusableLoginCodeData,
			{
				ipAddress,
				userAgent,
			}: {
				ipAddress?: string | null;
				userAgent?: string | null;
			} = {},
		): Promise<VerifyReusableLoginCodeResult> {
			const parsed = verifyReusableLoginCodeSchema.safeParse(data);

			if (!parsed.success) {
				return { success: false, errors: parsed.error.issues };
			}

			const email = normalizeEmail(parsed.data.email);
			const now = new Date();
			const nowIso = now.toISOString();
			const user = await userRepository.findByEmail(email);

			if (!user) {
				logger.warn({ email }, "Reusable login code verification failed");
				return { success: false, reason: "invalid_or_expired_code" };
			}

			const activeCode = await loginCodeRepository.findActiveByUserId(
				user.id,
				nowIso,
			);
			const submittedCodeHash = hashLoginCode(
				parsed.data.code,
				authConfig.loginCodePepper,
			);

			if (!activeCode || activeCode.codeHash !== submittedCodeHash) {
				if (activeCode) {
					const nextFailedAttempts = activeCode.failedAttempts + 1;
					await loginCodeRepository.recordFailedAttempt(
						activeCode.id,
						nextFailedAttempts,
						nowIso,
						nextFailedAttempts >= 5 ? nowIso : null,
					);
				}

				logger.warn({ email, userId: user.id }, "Reusable login code rejected");
				return { success: false, reason: "invalid_or_expired_code" };
			}

			await loginCodeRepository.recordSuccessfulUse(activeCode.id, nowIso);

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

			logger.info(
				{ email, userId: user.id, sessionId: session.id },
				"Created session from reusable login code",
			);

			return {
				success: true,
				user: toAuthUser(user),
				session,
			};
		},

		async rotateReusableLoginCode(
			user: AuthUser,
			{
				ipAddress,
			}: {
				ipAddress?: string | null;
			} = {},
		): Promise<RotateReusableLoginCodeResult> {
			const now = new Date();
			const nowIso = now.toISOString();
			const code = createSixDigitCode();
			const expiresAt = addSeconds(
				now,
				authConfig.loginCodeTtlSeconds,
			).toISOString();

			await loginCodeRepository.invalidateActiveByUserId(user.id, nowIso);
			await loginCodeRepository.create({
				id: crypto.randomUUID(),
				userId: user.id,
				codeHash: hashLoginCode(code, authConfig.loginCodePepper),
				expiresAt,
				createdByIp: ipAddress ?? null,
			});

			logger.info({ userId: user.id }, "Rotated reusable login code");

			return {
				success: true,
				code,
				status: {
					expiresAt,
					failedAttempts: 0,
					successfulUses: 0,
					lastUsedAt: null,
				},
			};
		},

		async applicantSignup(
			data: ApplicantSignupData,
			{
				ipAddress,
				userAgent,
			}: {
				ipAddress?: string | null;
				userAgent?: string | null;
			} = {},
		): Promise<ApplicantSignupResult> {
			const parsed = applicantSignupSchema.safeParse(data);

			if (!parsed.success) {
				return { success: false, errors: parsed.error.issues };
			}

			if (parsed.data.signupToken !== authConfig.applicantSignupToken) {
				logger.warn({ email: parsed.data.email }, "Applicant signup rejected");
				return { success: false, reason: "invalid_signup_token" };
			}

			const email = normalizeEmail(parsed.data.email);
			const existingUser = await userRepository.findByEmail(email);

			if (existingUser) {
				return { success: false, reason: "email_already_exists" };
			}

			const now = new Date();
			const nowIso = now.toISOString();
			const user = await userRepository.create({
				id: crypto.randomUUID(),
				email,
				globalRole: "applicant",
			});

			const session = await sessionRepository.create({
				id: crypto.randomUUID(),
				userId: user.id,
				expiresAt: addSeconds(now, authConfig.sessionTtlSeconds).toISOString(),
				lastAccessedAt: nowIso,
				ipAddress: ipAddress ?? null,
				userAgent: userAgent ?? null,
			});

			logger.info(
				{ email, userId: user.id, sessionId: session.id },
				"Applicant signup completed",
			);

			return {
				success: true,
				user: toAuthUser(user),
				session,
			};
		},

		async getReusableLoginCodeStatus(
			user: AuthUser,
		): Promise<GetReusableLoginCodeStatusResult> {
			const code = await loginCodeRepository.findActiveByUserId(
				user.id,
				new Date().toISOString(),
			);

			return {
				success: true,
				status: code ? toReusableLoginCodeStatus(code) : null,
			};
		},

		getApplicantSignupLink(): ApplicantSignupLink {
			return createApplicantSignupLink(authConfig);
		},

		async signout(sessionId: string): Promise<void> {
			await sessionRepository.deleteById(sessionId);
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
