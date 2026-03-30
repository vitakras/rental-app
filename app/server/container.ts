import { db } from "~/db";
import logger from "~/server/logger";
import { applicationDocumentRepository } from "~/server/repositories/application-document-repository";
import { applicationRepository } from "~/server/repositories/application-repository";
import { fileRepository } from "~/server/repositories/file-repository";
import { incomeSourceRepository } from "~/server/repositories/income-source-repository";
import { createApplicationService } from "~/server/services/application-service";
import { createFileService } from "~/server/services/file-service";
import { createLocalBlobStorage } from "~/server/storage/local-blob-storage";

export const repositories = {
	applicationRepository: applicationRepository(db),
	incomeSourceRepository: incomeSourceRepository(db),
	fileRepository: fileRepository(db),
	applicationDocumentRepository: applicationDocumentRepository(db),
};

const blobStorage = createLocalBlobStorage();

export const services = {
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
