import { createApp } from "~/app";
import { services } from "~/container";
import { createStorageRoutes } from "~/routes/storage.routes";

const app = createApp({ services, storageRoutes: createStorageRoutes() });

export default app;
export type { AppType } from "~/app";
export type {
	AddIncomeSourcesData,
	ApplicantSignupLink,
	ApplicationDocumentCategory,
	ApplicationDocumentType,
	ApplicationStatus,
	ApplicationWithDetails,
	AuthUser,
	CreateApplicationData,
	IncomeSourceDetail,
	IncomeSourceType,
	PetDetail,
	RequestEmailLoginData,
	ResidentDetail,
	ResidentRole,
	SubmittedApplicationSummary,
	UpdateOccupantsData,
	UserGlobalRole,
	VerifyEmailLoginData,
} from "~/contracts";
