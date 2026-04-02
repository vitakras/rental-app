import { createApp } from "~/app";
import { services } from "~/container";
import { createStorageRoutes } from "~/routes/storage.routes";

const app = createApp({ services, storageRoutes: createStorageRoutes() });

export default app;
export type { AppType } from "~/app";
export type {
	AddIncomeSourcesData,
	ApplicationDocumentDetail,
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
	ResidenceDetail,
	RequestEmailLoginData,
	ResidentDetail,
	ResidentRole,
	SubmittedApplicationSummary,
	UpsertResidenceData,
	UpdateOccupantsData,
	UserGlobalRole,
	VerifyEmailLoginData,
} from "~/contracts";
