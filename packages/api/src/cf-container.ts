import { drizzle } from "drizzle-orm/d1";
import { getAuthConfig } from "~/auth/config";
import logger from "~/cf-logger";
import { createDevAuthMailer } from "~/mailers/dev-auth.mailer";
import { applicationDocumentRepository } from "~/repositories/application-document.repository";
import { applicationRepository } from "~/repositories/application.repository";
import { emailLoginTokenRepository } from "~/repositories/email-login-token.repository";
import { fileRepository } from "~/repositories/file.repository";
import { incomeSourceRepository } from "~/repositories/income-source.repository";
import { loginCodeRepository } from "~/repositories/login-code.repository";
import { sessionRepository } from "~/repositories/session.repository";
import { userRepository } from "~/repositories/user.repository";
import type { AppServices } from "~/runtime-services";
import { createApplicationService } from "~/services/application.service";
import { createAuthService } from "~/services/auth.service";
import { createFileService } from "~/services/file.service";
import { createR2BlobStorage } from "~/storage/r2.blob.storage";
import type { CloudflareBindings } from "~/worker-env";

type DbInstance = typeof import("~/db").db;

export function createCfServices(env: CloudflareBindings): AppServices {
	const db = drizzle(env.DB, { casing: "snake_case" }) as unknown as DbInstance;

	const repositories = {
		userRepository: userRepository(db),
		emailLoginTokenRepository: emailLoginTokenRepository(db),
		loginCodeRepository: loginCodeRepository(db),
		sessionRepository: sessionRepository(db),
		applicationRepository: applicationRepository(db),
		incomeSourceRepository: incomeSourceRepository(db),
		fileRepository: fileRepository(db),
		applicationDocumentRepository: applicationDocumentRepository(db),
	};

	const blobStorage = createR2BlobStorage(env.STORAGE);
	const authConfig = getAuthConfig();
	const authMailer = createDevAuthMailer({
		logger: logger.child({ service: "auth-mailer" }),
	});

	return {
		authService: createAuthService({
			userRepository: repositories.userRepository,
			emailLoginTokenRepository: repositories.emailLoginTokenRepository,
			loginCodeRepository: repositories.loginCodeRepository,
			sessionRepository: repositories.sessionRepository,
			authMailer,
			authConfig,
			logger: logger.child({ service: "auth" }),
		}),
		applicationService: createApplicationService({
			...repositories,
			logger: logger.child({ service: "application" }),
		}),
		fileService: createFileService({
			fileRepository: repositories.fileRepository,
			applicationDocumentRepository:
				repositories.applicationDocumentRepository,
			blobStorage,
			logger: logger.child({ service: "file" }),
		}),
	};
}
