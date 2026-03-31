import { createApp } from "~/app";

const app = createApp();

export default app;
export type {
	AddIncomeSourcesData,
	ApplicationDocumentCategory,
	ApplicationDocumentType,
	ApplicationStatus,
	ApplicationWithDetails,
	ApplicantSignupLink,
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
export type { AppType } from "~/app";
