import { db } from "~/db";
import logger from "~/logger";
import { applicationRepository } from "~/repositories/application.repository";
import { applicationDocumentRepository } from "~/repositories/application-document.repository";
import { fileRepository } from "~/repositories/file.repository";
import { incomeSourceRepository } from "~/repositories/income-source.repository";
import { createApplicationService } from "~/services/application.service";
import { createFileService } from "~/services/file.service";
import { createLocalBlobStorage } from "~/storage/local.blob.storage";

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
