import crypto from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import type { AuthConfig } from "~/auth/config";
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
import { createAuthService } from "../auth.service";

const authConfig: AuthConfig = {
	loginCodeTtlSeconds: 14 * 24 * 60 * 60,
	sessionTtlSeconds: 3600,
	cookieName: "session",
	webBaseUrl: "http://127.0.0.1:5173",
	applicantSignupToken: "11111111-1111-4111-8111-111111111111",
	loginCodePepper: "test-pepper",
};

const baseUser: UserRecord = {
	id: "user-1",
	email: "alex@example.com",
	emailVerifiedAt: null,
	globalRole: "applicant",
	createdAt: "2026-01-01T00:00:00.000Z",
	updatedAt: "2026-01-01T00:00:00.000Z",
};

const baseSession: SessionRecord = {
	id: "session-1",
	userId: "user-1",
	expiresAt: "2099-01-01T00:00:00.000Z",
	lastAccessedAt: "2026-01-01T00:00:00.000Z",
	ipAddress: "127.0.0.1",
	userAgent: "bun-test",
	createdAt: "2026-01-01T00:00:00.000Z",
	updatedAt: "2026-01-01T00:00:00.000Z",
};

const baseLoginCode: LoginCodeRecord = {
	id: "login-code-1",
	userId: "user-1",
	codeHash: "hash-1",
	expiresAt: "2099-01-01T00:00:00.000Z",
	invalidatedAt: null,
	failedAttempts: 0,
	successfulUses: 0,
	lastUsedAt: null,
	createdByIp: null,
	createdAt: "2026-01-01T00:00:00.000Z",
	updatedAt: "2026-01-01T00:00:00.000Z",
};

function makeUserRepository(
	overrides?: Partial<UserRepository>,
): UserRepository {
	return {
		create: vi.fn(async () => baseUser),
		findById: vi.fn(async () => baseUser),
		findByEmail: vi.fn(async () => baseUser),
		markEmailVerified: vi.fn(async () => {}),
		...overrides,
	};
}

function makeSessionRepository(
	overrides?: Partial<SessionRepository>,
): SessionRepository {
	return {
		create: vi.fn(async () => baseSession),
		findById: vi.fn(async () => baseSession),
		deleteById: vi.fn(async () => {}),
		...overrides,
	};
}

function makeLoginCodeRepository(
	overrides?: Partial<LoginCodeRepository>,
): LoginCodeRepository {
	return {
		create: vi.fn(async () => baseLoginCode),
		findActiveByUserId: vi.fn(async () => baseLoginCode),
		invalidateActiveByUserId: vi.fn(async () => {}),
		recordSuccessfulUse: vi.fn(async () => {}),
		recordFailedAttempt: vi.fn(async () => {}),
		...overrides,
	};
}

describe("createAuthService", () => {
	it("creates an applicant user and session on successful signup", async () => {
		const userRepo = makeUserRepository({
			findByEmail: vi.fn(async () => null),
		});
		const sessionRepo = makeSessionRepository();
		const loginCodeRepo = makeLoginCodeRepository();

		const result = await createAuthService({
			userRepository: userRepo,
			loginCodeRepository: loginCodeRepo,
			sessionRepository: sessionRepo,
			authConfig,
		}).applicantSignup(
			{
				email: " Alex@Example.com ",
				signupToken: authConfig.applicantSignupToken,
			},
			{ ipAddress: "127.0.0.1", userAgent: "bun-test" },
		);

		expect(result.success).toBe(true);
		expect(userRepo.findByEmail).toHaveBeenCalledWith("alex@example.com");
		expect(userRepo.create).toHaveBeenCalledWith({
			id: expect.any(String),
			email: "alex@example.com",
			globalRole: "applicant",
		});
		expect(sessionRepo.create).toHaveBeenCalledWith({
			id: expect.any(String),
			userId: "user-1",
			expiresAt: expect.any(String),
			lastAccessedAt: expect.any(String),
			ipAddress: "127.0.0.1",
			userAgent: "bun-test",
		});
	});

	it("rejects applicant signup with an invalid token", async () => {
		const userRepo = makeUserRepository({
			findByEmail: vi.fn(async () => null),
		});
		const sessionRepo = makeSessionRepository();

		const result = await createAuthService({
			userRepository: userRepo,
			loginCodeRepository: makeLoginCodeRepository(),
			sessionRepository: sessionRepo,
			authConfig,
		}).applicantSignup({
			email: "alex@example.com",
			signupToken: "22222222-2222-4222-8222-222222222222",
		});

		expect(result).toEqual({
			success: false,
			reason: "invalid_signup_token",
		});
		expect(userRepo.create).not.toHaveBeenCalled();
		expect(sessionRepo.create).not.toHaveBeenCalled();
	});

	it("rejects applicant signup when the email already exists", async () => {
		const userRepo = makeUserRepository();
		const sessionRepo = makeSessionRepository();

		const result = await createAuthService({
			userRepository: userRepo,
			loginCodeRepository: makeLoginCodeRepository(),
			sessionRepository: sessionRepo,
			authConfig,
		}).applicantSignup({
			email: "alex@example.com",
			signupToken: authConfig.applicantSignupToken,
		});

		expect(result).toEqual({
			success: false,
			reason: "email_already_exists",
		});
		expect(userRepo.create).not.toHaveBeenCalled();
		expect(sessionRepo.create).not.toHaveBeenCalled();
	});

	it("returns the user for a valid session", async () => {
		const userRepo = makeUserRepository();
		const sessionRepo = makeSessionRepository();

		const result = await createAuthService({
			userRepository: userRepo,
			loginCodeRepository: makeLoginCodeRepository(),
			sessionRepository: sessionRepo,
			authConfig,
		}).getSessionUser("session-1");

		expect(result).toEqual({
			success: true,
			user: {
				id: "user-1",
				email: "alex@example.com",
				globalRole: "applicant",
			},
			session: baseSession,
		});
		expect(sessionRepo.findById).toHaveBeenCalledWith("session-1");
		expect(userRepo.findById).toHaveBeenCalledWith("user-1");
	});

	it("rejects an expired session", async () => {
		const result = await createAuthService({
			userRepository: makeUserRepository(),
			loginCodeRepository: makeLoginCodeRepository(),
			sessionRepository: makeSessionRepository({
				findById: vi.fn(async () => ({
					...baseSession,
					expiresAt: "2020-01-01T00:00:00.000Z",
				})),
			}),
			authConfig,
		}).getSessionUser("session-1");

		expect(result).toEqual({
			success: false,
			reason: "invalid_or_expired_session",
		});
	});

	it("creates a session and records a successful reusable code login", async () => {
		const userRepo = makeUserRepository();
		const loginCodeRepo = makeLoginCodeRepository({
			findActiveByUserId: vi.fn(async () => ({
				...baseLoginCode,
				codeHash: crypto
					.createHmac("sha256", authConfig.loginCodePepper)
					.update("123456")
					.digest("hex"),
			})),
		});
		const sessionRepo = makeSessionRepository();

		const result = await createAuthService({
			userRepository: userRepo,
			loginCodeRepository: loginCodeRepo,
			sessionRepository: sessionRepo,
			authConfig,
		}).verifyReusableLoginCode(
			{ email: "Alex@Example.com", code: "123456" },
			{ ipAddress: "127.0.0.1", userAgent: "bun-test" },
		);

		expect(result.success).toBe(true);
		expect(loginCodeRepo.findActiveByUserId).toHaveBeenCalledWith(
			"user-1",
			expect.any(String),
		);
		expect(loginCodeRepo.recordSuccessfulUse).toHaveBeenCalledWith(
			"login-code-1",
			expect.any(String),
		);
		expect(sessionRepo.create).toHaveBeenCalledTimes(1);
	});

	it("increments failed attempts for a wrong reusable code", async () => {
		const loginCodeRepo = makeLoginCodeRepository({
			findActiveByUserId: vi.fn(async () => baseLoginCode),
		});

		const result = await createAuthService({
			userRepository: makeUserRepository(),
			loginCodeRepository: loginCodeRepo,
			sessionRepository: makeSessionRepository(),
			authConfig,
		}).verifyReusableLoginCode({ email: "alex@example.com", code: "123456" });

		expect(result).toEqual({
			success: false,
			reason: "invalid_or_expired_code",
		});
		expect(loginCodeRepo.recordFailedAttempt).toHaveBeenCalledWith(
			"login-code-1",
			1,
			expect.any(String),
			null,
		);
	});

	it("invalidates the reusable code on the fifth wrong attempt", async () => {
		const loginCodeRepo = makeLoginCodeRepository({
			findActiveByUserId: vi.fn(async () => ({
				...baseLoginCode,
				failedAttempts: 4,
			})),
		});

		const result = await createAuthService({
			userRepository: makeUserRepository(),
			loginCodeRepository: loginCodeRepo,
			sessionRepository: makeSessionRepository(),
			authConfig,
		}).verifyReusableLoginCode({ email: "alex@example.com", code: "123456" });

		expect(result).toEqual({
			success: false,
			reason: "invalid_or_expired_code",
		});
		expect(loginCodeRepo.recordFailedAttempt).toHaveBeenCalledWith(
			"login-code-1",
			5,
			expect.any(String),
			expect.any(String),
		);
	});

	it("rotates a reusable login code", async () => {
		const loginCodeRepo = makeLoginCodeRepository();

		const result = await createAuthService({
			userRepository: makeUserRepository(),
			loginCodeRepository: loginCodeRepo,
			sessionRepository: makeSessionRepository(),
			authConfig,
		}).rotateReusableLoginCode({
			id: "user-1",
			email: "alex@example.com",
			globalRole: "applicant",
		});

		expect(result.success).toBe(true);
		expect(result.code).toMatch(/^\d{6}$/);
		expect(loginCodeRepo.invalidateActiveByUserId).toHaveBeenCalledWith(
			"user-1",
			expect.any(String),
		);
		expect(loginCodeRepo.create).toHaveBeenCalledTimes(1);
	});

	it("returns reusable login code status for the active code", async () => {
		const loginCodeRepo = makeLoginCodeRepository({
			findActiveByUserId: vi.fn(async () => ({
				...baseLoginCode,
				failedAttempts: 2,
				successfulUses: 3,
				lastUsedAt: "2026-01-02T00:00:00.000Z",
			})),
		});

		const result = await createAuthService({
			userRepository: makeUserRepository(),
			loginCodeRepository: loginCodeRepo,
			sessionRepository: makeSessionRepository(),
			authConfig,
		}).getReusableLoginCodeStatus({
			id: "user-1",
			email: "alex@example.com",
			globalRole: "applicant",
		});

		expect(result).toEqual({
			success: true,
			status: {
				expiresAt: "2099-01-01T00:00:00.000Z",
				failedAttempts: 2,
				successfulUses: 3,
				lastUsedAt: "2026-01-02T00:00:00.000Z",
			},
		});
	});
});
