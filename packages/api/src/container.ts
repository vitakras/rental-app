import { createAuthConfig } from "~/auth/config";
import { createDb } from "~/db";
import logger from "~/logger";
import { applicationRepository } from "~/repositories/application.repository";
import { applicationDocumentRepository } from "~/repositories/application-document.repository";
import { fileRepository } from "~/repositories/file.repository";
import { incomeSourceRepository } from "~/repositories/income-source.repository";
import { loginCodeRepository } from "~/repositories/login-code.repository";
import { sessionRepository } from "~/repositories/session.repository";
import { userRepository } from "~/repositories/user.repository";
import { createApplicationService } from "~/services/application.service";
import { createAuthService } from "~/services/auth.service";
import { createFileService } from "~/services/file.service";
import { createR2BlobStorage } from "~/storage/r2.blob.storage";
import type { CloudflareBindings } from "~/worker-env";

export interface AppServices {
	authService: ReturnType<typeof createAuthService>;
	applicationService: ReturnType<typeof createApplicationService>;
	fileService: ReturnType<typeof createFileService>;
}

export function createCfServices(env: CloudflareBindings): AppServices {
	const db = createDb(env.DB);
	const authConfig = createAuthConfig(env);

	const repositories = {
		userRepository: userRepository(db),
		loginCodeRepository: loginCodeRepository(db),
		sessionRepository: sessionRepository(db),
		applicationRepository: applicationRepository(db),
		incomeSourceRepository: incomeSourceRepository(db),
		fileRepository: fileRepository(db),
		applicationDocumentRepository: applicationDocumentRepository(db),
	};

	const blobStorage = createR2BlobStorage(env.STORAGE);
	return {
		authService: createAuthService({
			userRepository: repositories.userRepository,
			loginCodeRepository: repositories.loginCodeRepository,
			sessionRepository: repositories.sessionRepository,
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
}
