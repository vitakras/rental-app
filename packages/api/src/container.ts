import { getAuthConfig } from "~/auth/config";
import { db } from "~/db";
import logger from "~/logger";
import { createDevAuthMailer } from "~/mailers/dev-auth.mailer";
import { applicationRepository } from "~/repositories/application.repository";
import { applicationDocumentRepository } from "~/repositories/application-document.repository";
import { emailLoginTokenRepository } from "~/repositories/email-login-token.repository";
import { fileRepository } from "~/repositories/file.repository";
import { incomeSourceRepository } from "~/repositories/income-source.repository";
import { loginCodeRepository } from "~/repositories/login-code.repository";
import { sessionRepository } from "~/repositories/session.repository";
import { userRepository } from "~/repositories/user.repository";
import { createApplicationService } from "~/services/application.service";
import { createAuthService } from "~/services/auth.service";
import { createFileService } from "~/services/file.service";
import type { AppServices } from "~/runtime-services";
import { createLocalBlobStorage } from "~/storage/local.blob.storage";

export const repositories = {
	userRepository: userRepository(db),
	emailLoginTokenRepository: emailLoginTokenRepository(db),
	loginCodeRepository: loginCodeRepository(db),
	sessionRepository: sessionRepository(db),
	applicationRepository: applicationRepository(db),
	incomeSourceRepository: incomeSourceRepository(db),
	fileRepository: fileRepository(db),
	applicationDocumentRepository: applicationDocumentRepository(db),
};

const blobStorage = createLocalBlobStorage();
const authConfig = getAuthConfig();
const authMailer = createDevAuthMailer({
	logger: logger.child({ service: "auth-mailer" }),
});

export const services: AppServices = {
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
		applicationDocumentRepository: repositories.applicationDocumentRepository,
		blobStorage,
		logger: logger.child({ service: "file" }),
	}),
};
