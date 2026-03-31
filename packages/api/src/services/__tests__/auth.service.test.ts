import { describe, expect, it, mock } from "bun:test";
import type { AuthConfig } from "~/auth/config";
import type { AuthMailer } from "~/mailers/auth.mailer";
import type {
	EmailLoginTokenRecord,
	EmailLoginTokenRepository,
} from "~/repositories/email-login-token.repository";
import type {
	SessionRecord,
	SessionRepository,
} from "~/repositories/session.repository";
import type { UserRecord, UserRepository } from "~/repositories/user.repository";
import { createAuthService } from "../auth.service";

const authConfig: AuthConfig = {
	loginTokenTtlSeconds: 900,
	sessionTtlSeconds: 3600,
	cookieName: "session",
	webBaseUrl: "http://127.0.0.1:5173",
	applicantSignupToken: "11111111-1111-4111-8111-111111111111",
};

const baseUser: UserRecord = {
	id: "user-1",
	email: "alex@example.com",
	emailVerifiedAt: null,
	globalRole: "applicant",
	createdAt: "2026-01-01T00:00:00.000Z",
	updatedAt: "2026-01-01T00:00:00.000Z",
};

const baseToken: EmailLoginTokenRecord = {
	id: "token-1",
	email: "alex@example.com",
	tokenHash: "hash-1",
	purpose: "login",
	expiresAt: "2099-01-01T00:00:00.000Z",
	consumedAt: null,
	createdByIp: null,
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

function makeUserRepository(
	overrides?: Partial<UserRepository>,
): UserRepository {
	return {
		create: mock(async () => baseUser),
		findById: mock(async () => baseUser),
		findByEmail: mock(async () => baseUser),
		markEmailVerified: mock(async () => {}),
		...overrides,
	};
}

function makeTokenRepository(
	overrides?: Partial<EmailLoginTokenRepository>,
): EmailLoginTokenRepository {
	return {
		create: mock(async () => baseToken),
		findActiveByEmailAndTokenHash: mock(async () => baseToken),
		markConsumed: mock(async () => {}),
		...overrides,
	};
}

function makeSessionRepository(
	overrides?: Partial<SessionRepository>,
): SessionRepository {
	return {
		create: mock(async () => baseSession),
		findById: mock(async () => baseSession),
		...overrides,
	};
}

function makeMailer(overrides?: Partial<AuthMailer>): AuthMailer {
	return {
		sendLoginEmail: mock(async () => {}),
		...overrides,
	};
}

describe("createAuthService", () => {
	it("creates a token and sends login email for an existing user", async () => {
		const userRepo = makeUserRepository();
		const tokenRepo = makeTokenRepository();
		const sessionRepo = makeSessionRepository();
		const mailer = makeMailer();

		const result = await createAuthService({
			userRepository: userRepo,
			emailLoginTokenRepository: tokenRepo,
			sessionRepository: sessionRepo,
			authMailer: mailer,
			authConfig,
		}).requestEmailLogin(
			{ email: " Alex@Example.com " },
			{ ipAddress: "127.0.0.1" },
		);

		expect(result).toEqual({ success: true });
		expect(userRepo.findByEmail).toHaveBeenCalledWith("alex@example.com");
		expect(tokenRepo.create).toHaveBeenCalledTimes(1);
		const tokenCreateInput = (tokenRepo.create as ReturnType<typeof mock>).mock
			.calls[0][0];
		expect(tokenCreateInput.email).toBe("alex@example.com");
		expect(tokenCreateInput.createdByIp).toBe("127.0.0.1");
		expect(typeof tokenCreateInput.tokenHash).toBe("string");
		expect(tokenCreateInput.tokenHash).not.toBe("");

		expect(mailer.sendLoginEmail).toHaveBeenCalledTimes(1);
		const emailInput = (mailer.sendLoginEmail as ReturnType<typeof mock>).mock
			.calls[0][0];
		expect(emailInput.email).toBe("alex@example.com");
		expect(emailInput.loginUrl).toContain("http://127.0.0.1:5173/login");
		expect(emailInput.token).not.toBe(tokenCreateInput.tokenHash);
	});

	it("returns success without creating a token for an unknown email", async () => {
		const userRepo = makeUserRepository({
			findByEmail: mock(async () => null),
		});
		const tokenRepo = makeTokenRepository();
		const mailer = makeMailer();

		const result = await createAuthService({
			userRepository: userRepo,
			emailLoginTokenRepository: tokenRepo,
			sessionRepository: makeSessionRepository(),
			authMailer: mailer,
			authConfig,
		}).requestEmailLogin({ email: "missing@example.com" });

		expect(result).toEqual({ success: true });
		expect(tokenRepo.create).not.toHaveBeenCalled();
		expect(mailer.sendLoginEmail).not.toHaveBeenCalled();
	});

	it("creates a session and consumes the token on successful verification", async () => {
		const userRepo = makeUserRepository();
		const tokenRepo = makeTokenRepository();
		const sessionRepo = makeSessionRepository();

		const result = await createAuthService({
			userRepository: userRepo,
			emailLoginTokenRepository: tokenRepo,
			sessionRepository: sessionRepo,
			authMailer: makeMailer(),
			authConfig,
		}).verifyEmailLogin(
			{ email: "Alex@Example.com", token: "plain-token" },
			{ ipAddress: "127.0.0.1", userAgent: "bun-test" },
		);

		expect(result.success).toBe(true);
		expect(
			tokenRepo.findActiveByEmailAndTokenHash,
		).toHaveBeenCalledWith(
			"alex@example.com",
			expect.any(String),
			expect.any(String),
		);
		expect(tokenRepo.markConsumed).toHaveBeenCalledWith(
			"token-1",
			expect.any(String),
		);
		expect(userRepo.markEmailVerified).toHaveBeenCalledWith(
			"user-1",
			expect.any(String),
		);
		expect(sessionRepo.create).toHaveBeenCalledTimes(1);
		const sessionInput = (sessionRepo.create as ReturnType<typeof mock>).mock
			.calls[0][0];
		expect(sessionInput.userId).toBe("user-1");
		expect(sessionInput.ipAddress).toBe("127.0.0.1");
		expect(sessionInput.userAgent).toBe("bun-test");
	});

	it("creates an applicant user and session on successful signup", async () => {
		const userRepo = makeUserRepository({
			findByEmail: mock(async () => null),
		});
		const sessionRepo = makeSessionRepository();

		const result = await createAuthService({
			userRepository: userRepo,
			emailLoginTokenRepository: makeTokenRepository(),
			sessionRepository: sessionRepo,
			authMailer: makeMailer(),
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
		expect(userRepo.create).toHaveBeenCalledTimes(1);
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
			findByEmail: mock(async () => null),
		});
		const sessionRepo = makeSessionRepository();

		const result = await createAuthService({
			userRepository: userRepo,
			emailLoginTokenRepository: makeTokenRepository(),
			sessionRepository: sessionRepo,
			authMailer: makeMailer(),
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
			emailLoginTokenRepository: makeTokenRepository(),
			sessionRepository: sessionRepo,
			authMailer: makeMailer(),
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

	it("rejects verification when the token lookup fails", async () => {
		const result = await createAuthService({
			userRepository: makeUserRepository(),
			emailLoginTokenRepository: makeTokenRepository({
				findActiveByEmailAndTokenHash: mock(async () => null),
			}),
			sessionRepository: makeSessionRepository(),
			authMailer: makeMailer(),
			authConfig,
		}).verifyEmailLogin({ email: "alex@example.com", token: "wrong" });

		expect(result).toEqual({
			success: false,
			reason: "invalid_or_expired_token",
		});
	});

	it("rejects verification when the email does not match the token lookup", async () => {
		const tokenRepo = makeTokenRepository({
			findActiveByEmailAndTokenHash: mock(async (email) =>
				email === "alex@example.com" ? baseToken : null,
			),
		});

		const result = await createAuthService({
			userRepository: makeUserRepository(),
			emailLoginTokenRepository: tokenRepo,
			sessionRepository: makeSessionRepository(),
			authMailer: makeMailer(),
			authConfig,
		}).verifyEmailLogin({ email: "other@example.com", token: "plain-token" });

		expect(result).toEqual({
			success: false,
			reason: "invalid_or_expired_token",
		});
	});

	it("rejects verification for an expired token", async () => {
		const result = await createAuthService({
			userRepository: makeUserRepository(),
			emailLoginTokenRepository: makeTokenRepository({
				findActiveByEmailAndTokenHash: mock(async () => null),
			}),
			sessionRepository: makeSessionRepository(),
			authMailer: makeMailer(),
			authConfig,
		}).verifyEmailLogin({ email: "alex@example.com", token: "expired-token" });

		expect(result).toEqual({
			success: false,
			reason: "invalid_or_expired_token",
		});
	});

	it("rejects verification for an already consumed token", async () => {
		const result = await createAuthService({
			userRepository: makeUserRepository(),
			emailLoginTokenRepository: makeTokenRepository({
				findActiveByEmailAndTokenHash: mock(async () => null),
			}),
			sessionRepository: makeSessionRepository(),
			authMailer: makeMailer(),
			authConfig,
		}).verifyEmailLogin({ email: "alex@example.com", token: "used-token" });

		expect(result).toEqual({
			success: false,
			reason: "invalid_or_expired_token",
		});
	});

	it("returns the user for a valid session", async () => {
		const userRepo = makeUserRepository();
		const sessionRepo = makeSessionRepository();

		const result = await createAuthService({
			userRepository: userRepo,
			emailLoginTokenRepository: makeTokenRepository(),
			sessionRepository: sessionRepo,
			authMailer: makeMailer(),
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
			emailLoginTokenRepository: makeTokenRepository(),
			sessionRepository: makeSessionRepository({
				findById: mock(async () => ({
					...baseSession,
					expiresAt: "2020-01-01T00:00:00.000Z",
				})),
			}),
			authMailer: makeMailer(),
			authConfig,
		}).getSessionUser("session-1");

		expect(result).toEqual({
			success: false,
			reason: "invalid_or_expired_session",
		});
	});
});
