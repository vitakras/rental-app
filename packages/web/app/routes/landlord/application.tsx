import type {
	ApplicationDocumentDetail,
	ApplicationWithDetails,
	ResidenceDetail,
} from "api";
import { Link } from "react-router";
import { BASE_API_URL } from "~/config/env";
import { apiClient } from "~/lib/api";
import type { Route } from "./+types/application";

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
	const id = Number(params.id);
	if (Number.isNaN(id)) throw new Response("Not Found", { status: 404 });
	const response = await apiClient.landlord.applications[":id"].$get({
		param: { id: String(id) },
	});
	if (response.status === 404) throw new Response("Not Found", { status: 404 });
	if (!response.ok) throw new Response(null, { status: response.status });
	const { application } = (await response.json()) as {
		application: ApplicationWithDetails;
	};

	return { application };
}

export function meta({ data }: Route.MetaArgs) {
	const primary = data?.application.residents.find((r) => r.role === "primary");
	return [
		{ title: primary ? `${primary.fullName} — Application` : "Application" },
	];
}

function formatDate(dateStr: string | null | undefined): string {
	if (!dateStr) return "—";
	const normalized = dateStr.length > 10 ? dateStr.replace(" ", "T") : dateStr;
	return new Intl.DateTimeFormat("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	}).format(new Date(normalized));
}

const ROLE_LABELS: Record<string, string> = {
	primary: "Primary Applicant",
	"co-applicant": "Co-applicant",
	dependent: "Dependent",
	child: "Child",
};

const PET_EMOJI: Record<string, string> = {
	Dog: "🐶",
	Cat: "🐱",
	Bird: "🐦",
};

const INCOME_TYPE_LABELS: Record<string, string> = {
	employment: "Employment",
	self_employment: "Self-employment",
	other: "Other",
};

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
	government_id: "Government ID",
	paystub: "Paystubs",
	employment_letter: "Employment letter",
	bank_statement: "Bank statements",
	other: "Supporting document",
};

function formatCurrency(cents: number): string {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
		maximumFractionDigits: 0,
	}).format(cents / 100);
}

function SectionHeading({ children }: { children: React.ReactNode }) {
	return (
		<p className="text-[10px] text-[#C4714A] tracking-widest uppercase font-medium mb-3">
			{children}
		</p>
	);
}

function Field({
	label,
	value,
	fallback,
}: {
	label: string;
	value?: string | null;
	fallback?: string;
}) {
	if (!value && fallback === undefined) return null;
	return (
		<div>
			<p className="text-[10px] text-[#7A7268] uppercase tracking-wider mb-0.5">
				{label}
			</p>
			<p className="text-sm text-[#1C1A17]">{value || fallback}</p>
		</div>
	);
}

function IncomeSection({
	incomeSources,
}: {
	incomeSources: {
		id: number;
		type: string;
		employerOrSourceName: string;
		titleOrOccupation?: string | null;
		monthlyAmountCents: number;
		startDate: string;
		endDate?: string | null;
		notes?: string | null;
	}[];
}) {
	if (incomeSources.length === 0) return null;
	return (
		<div className="mt-4 pt-4 border-t border-[#F0EBE3]">
			<p className="text-[10px] text-[#7A7268] uppercase tracking-wider mb-3">
				Income
			</p>
			<div className="space-y-4">
				{incomeSources.map((source, i) => (
					<div key={source.id}>
						{i > 0 && <div className="border-t border-[#F0EBE3] mb-4" />}
						<div className="grid grid-cols-2 gap-3">
							<div className="col-span-2">
								<p className="text-[10px] text-[#7A7268] uppercase tracking-wider mb-0.5">
									{INCOME_TYPE_LABELS[source.type] ?? source.type}
								</p>
								<p className="text-sm text-[#1C1A17]">
									{source.employerOrSourceName}
								</p>
							</div>
							{source.titleOrOccupation && (
								<Field label="Title" value={source.titleOrOccupation} />
							)}
							<Field
								label="Monthly income"
								value={`${formatCurrency(source.monthlyAmountCents)}/mo`}
							/>
							<Field label="Start date" value={formatDate(source.startDate)} />
							<Field
								label="End date"
								value={source.endDate ? formatDate(source.endDate) : "Current"}
							/>
							{source.notes && (
								<div className="col-span-2">
									<Field label="Notes" value={source.notes} />
								</div>
							)}
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

function ResidenceSection({ residences }: { residences: ResidenceDetail[] }) {
	return (
		<div className="mt-4 pt-4 border-t border-[#F0EBE3]">
			<p className="text-[10px] text-[#7A7268] uppercase tracking-wider mb-3">
				Residence History
			</p>
			{residences.length === 0 ? (
				<p className="text-sm text-[#9E9589]">No residence history provided</p>
			) : (
				<div className="space-y-4">
					{residences.map((r, i) => (
						<div key={r.id}>
							{i > 0 && <div className="border-t border-[#F0EBE3] mb-4" />}
							<div className="grid grid-cols-2 gap-3">
								<div className="col-span-2">
									<Field label="Address" value={r.address} fallback="—" />
								</div>
								<Field label="From" value={formatDate(r.fromDate)} />
								<Field
									label="To"
									value={r.toDate ? formatDate(r.toDate) : "Present"}
								/>
								<Field label="Rental" value={r.isRental ? "Yes" : "No"} />
								<Field label="Reason for leaving" value={r.reasonForLeaving} />
								{r.isRental && (
									<>
										<Field
											label="Landlord name"
											value={r.landlordName}
											fallback="—"
										/>
										<Field
											label="Landlord phone"
											value={r.landlordPhone}
											fallback="—"
										/>
									</>
								)}
								{r.notes && (
									<div className="col-span-2">
										<Field label="Notes" value={r.notes} />
									</div>
								)}
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}

function DocumentsSection({
	documents,
	adultResidents,
	applicationId,
}: {
	documents: ApplicationDocumentDetail[];
	adultResidents: { id: number; fullName: string }[];
	applicationId: number;
}) {
	if (documents.length === 0) {
		return (
			<div className="bg-white rounded-2xl p-5 shadow-[0_1px_4px_rgba(28,26,23,0.07)]">
				<p className="text-sm text-[#9E9589]">No documents uploaded</p>
			</div>
		);
	}

	return (
		<div className="space-y-3">
			{adultResidents.map((resident) => {
				const residentDocs = documents.filter(
					(d) => d.residentId === resident.id,
				);
				return (
					<div
						key={resident.id}
						className="bg-white rounded-2xl p-5 shadow-[0_1px_4px_rgba(28,26,23,0.07)]"
					>
						<p className="text-[10px] text-[#7A7268] uppercase tracking-wider mb-3">
							{resident.fullName}
						</p>
						{residentDocs.length > 0 ? (
							<div className="space-y-3">
								{residentDocs.map((doc) => {
									const fileUrl = `${BASE_API_URL}/landlord/applications/${applicationId}/files/${doc.fileId}`;
									return (
										<div key={doc.id}>
											<p className="text-[10px] text-[#7A7268] uppercase tracking-wider mb-0.5">
												{DOCUMENT_TYPE_LABELS[doc.documentType] ??
													doc.documentType}
											</p>
											<div className="flex items-center gap-1 mt-0.5">
												<p className="text-sm text-[#1C1A17] truncate flex-1 min-w-0">
													{doc.originalFilename}
												</p>
												<a
													href={`${fileUrl}?download=true`}
													download={doc.originalFilename}
													className="shrink-0 flex items-center justify-center w-8 h-8 -mr-1 rounded-lg text-[#B0A89E] active:text-[#7A7268] active:bg-[#F0EBE3] transition-colors"
												>
													<svg
														width="14"
														height="14"
														viewBox="0 0 14 14"
														fill="none"
														aria-hidden="true"
													>
														<path
															d="M7 1v7.5M7 8.5 4 5.5M7 8.5l3-3"
															stroke="currentColor"
															strokeWidth="1.4"
															strokeLinecap="round"
															strokeLinejoin="round"
														/>
														<path
															d="M1.5 10.5v1A1 1 0 0 0 2.5 12.5h9a1 1 0 0 0 1-1v-1"
															stroke="currentColor"
															strokeWidth="1.4"
															strokeLinecap="round"
														/>
													</svg>
													<span className="sr-only">
														Download {doc.originalFilename}
													</span>
												</a>
											</div>
											<a
												href={fileUrl}
												target="_blank"
												rel="noopener noreferrer"
												className="mt-2 flex items-center justify-center w-full h-9 rounded-lg bg-[#C4714A] text-white text-xs font-medium active:bg-[#A85A36] transition-colors"
											>
												View
											</a>
										</div>
									);
								})}
							</div>
						) : (
							<p className="text-sm text-[#9E9589]">No documents uploaded</p>
						)}
					</div>
				);
			})}
		</div>
	);
}

export default function LandlordApplicationDetail({
	loaderData,
}: Route.ComponentProps) {
	const { application } = loaderData;
	const primary = application.residents.find((r) => r.role === "primary");
	const adultResidents = application.residents.filter(
		(r) => r.role !== "child",
	);

	return (
		<div
			className="min-h-screen bg-[#F5F0E8]"
			style={{ fontFamily: "'DM Sans', sans-serif" }}
		>
			{/* Top bar */}
			<div className="fixed top-0 left-0 right-0 z-30 bg-[#F5F0E8]/90 backdrop-blur-sm border-b border-[#E8E1D9]">
				<div className="max-w-lg mx-auto px-5 py-4 flex items-center gap-3">
					<Link
						to="/l/applications"
						className="text-[#7A7268] hover:text-[#1C1A17] transition-colors"
						aria-label="Back to applications"
					>
						<svg
							aria-hidden="true"
							width="20"
							height="20"
							viewBox="0 0 20 20"
							fill="none"
						>
							<path
								d="M12.5 15L7.5 10L12.5 5"
								stroke="currentColor"
								strokeWidth="1.5"
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
						</svg>
					</Link>
					<h1
						className="text-base text-[#1C1A17] flex-1 truncate"
						style={{ fontFamily: "'Fraunces', serif", fontWeight: 400 }}
					>
						{primary?.fullName ?? `Application #${application.id}`}
					</h1>
					<span className="shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[#F5E8DF] text-[#C4714A]">
						{application.status.charAt(0).toUpperCase() +
							application.status.slice(1)}
					</span>
				</div>
			</div>

			{/* Content */}
			<div className="max-w-lg mx-auto px-5 pt-[72px] pb-12 space-y-4">
				{/* Application details */}
				<div className="mt-6">
					<SectionHeading>Application</SectionHeading>
					<div className="bg-white rounded-2xl p-5 shadow-[0_1px_4px_rgba(28,26,23,0.07)] grid grid-cols-2 gap-4">
						<Field
							label="Move-in date"
							value={formatDate(application.desiredMoveInDate)}
						/>
						<Field
							label="Submitted"
							value={formatDate(application.createdAt)}
						/>
						<Field label="Smokes" value={application.smokes ? "Yes" : "No"} />
						<Field label="Application #" value={String(application.id)} />
						{application.notes && (
							<div className="col-span-2">
								<Field label="Notes" value={application.notes} />
							</div>
						)}
					</div>
				</div>

				{/* Residents — primary + others unified */}
				{application.residents.length > 0 && (
					<div>
						<SectionHeading>Residents</SectionHeading>
						<div className="space-y-3">
							{application.residents.map((resident) => (
								<div
									key={resident.id}
									className="bg-white rounded-2xl p-5 shadow-[0_1px_4px_rgba(28,26,23,0.07)]"
								>
									<p className="text-[10px] text-[#7A7268] uppercase tracking-wider mb-3">
										{ROLE_LABELS[resident.role] ?? resident.role}
									</p>
									<div className="grid grid-cols-2 gap-4">
										<Field label="Name" value={resident.fullName} />
										<Field label="Date of birth" value={resident.dateOfBirth} />
										{resident.email && (
											<Field label="Email" value={resident.email} />
										)}
										{resident.phone && (
											<Field label="Phone" value={resident.phone} />
										)}
									</div>
									{resident.role !== "child" &&
										resident.role !== "dependent" && (
											<>
												<IncomeSection incomeSources={resident.incomeSources} />
												<ResidenceSection residences={resident.residences} />
											</>
										)}
								</div>
							))}
						</div>
					</div>
				)}

				{/* Pets */}
				<div>
					<SectionHeading>Pets</SectionHeading>
					{application.pets.length === 0 ? (
						<div className="bg-white rounded-2xl p-5 shadow-[0_1px_4px_rgba(28,26,23,0.07)]">
							<p className="text-sm text-[#9E9589]">No pets</p>
						</div>
					) : (
						<div className="space-y-3">
							{application.pets.map((pet) => (
								<div
									key={pet.id}
									className="bg-white rounded-2xl p-5 shadow-[0_1px_4px_rgba(28,26,23,0.07)]"
								>
									<p className="text-[10px] text-[#7A7268] uppercase tracking-wider mb-3">
										{pet.name
											? `${PET_EMOJI[pet.type] ?? "🐾"} ${pet.name}`
											: pet.type}
									</p>
									<div className="grid grid-cols-2 gap-4">
										<Field label="Type" value={pet.type} />
										<Field label="Breed" value={pet.breed} />
										{pet.notes && (
											<div className="col-span-2">
												<Field label="Notes" value={pet.notes} />
											</div>
										)}
									</div>
								</div>
							))}
						</div>
					)}
				</div>

				{/* Documents */}
				<div>
					<SectionHeading>Documents</SectionHeading>
					<DocumentsSection
						documents={application.documents}
						adultResidents={adultResidents}
						applicationId={application.id}
					/>
				</div>
			</div>
		</div>
	);
}
