export type ResidentRole = "primary" | "co-applicant" | "dependent" | "child";

export type IncomeSourceType = "employment" | "self_employment" | "other";

export type ApplicationStatus =
	| "pending"
	| "submitted"
	| "approved"
	| "rejected";

export type ApplicationDocumentCategory =
	| "identity"
	| "income"
	| "residence"
	| "reference"
	| "other";

export type ApplicationDocumentType =
	| "government_id"
	| "paystub"
	| "employment_letter"
	| "bank_statement"
	| "reference_letter"
	| "other";

export type CreateApplicationData = {
	desiredMoveInDate: string;
	owner: {
		fullName: string;
		dateOfBirth: string;
		email: string;
		phone: string;
	};
	additionalAdults?: Array<{
		fullName: string;
		dateOfBirth: string;
		role: "co-applicant" | "dependent";
		email?: string;
	}>;
	children?: Array<{
		fullName: string;
		dateOfBirth: string;
	}>;
	pets?: Array<{
		type: string;
		name?: string;
		breed?: string;
		notes?: string;
	}>;
};

export type UpdateOccupantsData = {
	smokes: boolean;
	additionalAdults?: Array<{
		fullName: string;
		dateOfBirth: string;
		role: "co-applicant" | "dependent";
		email?: string;
	}>;
	children?: Array<{
		fullName: string;
		dateOfBirth: string;
	}>;
	pets?: Array<{
		type: string;
		name?: string;
		breed?: string;
		notes?: string;
	}>;
};

export type AddIncomeSourcesData = Array<{
	residentId: number;
	incomeSources: Array<{
		type: IncomeSourceType;
		employerOrSourceName: string;
		titleOrOccupation?: string;
		monthlyAmountCents: number;
		startDate: string;
		endDate?: string;
		notes?: string;
	}>;
}>;

export type SubmittedApplicationSummary = {
	id: number;
	status: string;
	desiredMoveInDate: string;
	createdAt: string;
	primaryApplicantName: string;
};

export type IncomeSourceDetail = {
	id: number;
	residentId: number;
	type: string;
	employerOrSourceName: string;
	titleOrOccupation: string | null;
	monthlyAmountCents: number;
	startDate: string;
	endDate: string | null;
	notes: string | null;
	createdAt: string;
	updatedAt: string;
};

export type ResidentDetail = {
	id: number;
	applicationId: number;
	role: string;
	fullName: string;
	dateOfBirth: string;
	email: string | null;
	phone: string | null;
	createdAt: string;
	updatedAt: string;
	incomeSources: IncomeSourceDetail[];
};

export type PetDetail = {
	id: number;
	applicationId: number;
	type: string;
	name: string | null;
	breed: string | null;
	notes: string | null;
	createdAt: string;
	updatedAt: string;
};

export type ApplicationWithDetails = {
	id: number;
	status: string;
	desiredMoveInDate: string;
	smokes: boolean;
	createdAt: string;
	updatedAt: string;
	residents: ResidentDetail[];
	pets: PetDetail[];
};

export type { AppType } from "./src/app";
