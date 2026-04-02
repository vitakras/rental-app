import { createApp } from "~/app";

const app = createApp();

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
