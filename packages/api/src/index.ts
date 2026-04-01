import { createApp } from "~/app";

const app = createApp();

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
