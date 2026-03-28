import { db } from "~/db";
import { applicationRepository } from "~/server/repositories/application.repository";
import { createApplicationService } from "~/server/services/application.service";

const repositories = {
	applicationRepository: applicationRepository(db),
};

export const services = {
	applicationService: createApplicationService(repositories),
};
