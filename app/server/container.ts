import { db } from "~/db";
import logger from "~/server/logger";
import { applicationRepository } from "~/server/repositories/application.repository";
import { createApplicationService } from "~/server/services/application.service";

export const repositories = {
	applicationRepository: applicationRepository(db),
};

export const services = {
	applicationService: createApplicationService({
		...repositories,
		logger: logger.child({ service: "application" }),
	}),
};
