import type { ApplicationWithDetails } from "api";
import { data, Form, Link, useNavigation } from "react-router";
import { Button } from "~/components/ui/button";
import { apiClient } from "~/lib/api";
import type { Route } from "./+types/index";

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
	const id = Number(params.id);
	if (!Number.isInteger(id) || id <= 0) {
		throw data(null, { status: 404 });
	}
	const response = await apiClient.applications[":id"].$get({
		param: { id: String(id) },
	});

	if (response.status === 404) {
		throw data(null, { status: 404 });
	}

	if (!response.ok) {
		throw data(null, { status: response.status });
	}

	const { application } = (await response.json()) as {
		application: ApplicationWithDetails;
	};
	return { applicationId: id, application };
}

export async function clientAction({ params }: Route.ClientActionArgs) {
	const id = Number(params.id);
	if (!Number.isInteger(id) || id <= 0) {
		throw data(null, { status: 404 });
	}
	const response = await apiClient.applications[":id"].submit.$post({
		param: { id: String(id) },
	});

	if (response.status === 404) throw data(null, { status: 404 });
	if (response.status === 409) throw data(null, { status: 409 });
	if (!response.ok) {
		throw data(null, { status: response.status });
	}

	return null;
}

export function meta() {
	return [{ title: "Review Application — Find Your Home" }];
}

function formatDate(dateStr: string | null | undefined): string {
	if (!dateStr) return "Not provided";
	const normalized = dateStr.length > 10 ? dateStr.replace(" ", "T") : dateStr;
	return new Intl.DateTimeFormat("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	}).format(new Date(normalized));
}

function formatCurrency(cents: number): string {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
		maximumFractionDigits: 0,
	}).format(cents / 100);
}

const ROLE_LABELS: Record<string, string> = {
	primary: "Primary applicant",
	"co-applicant": "Co-applicant",
	dependent: "Adult dependent",
	child: "Child",
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

function SectionLabel({ children }: { children: React.ReactNode }) {
	return (
		<p className="text-xs text-[#C4714A] font-medium tracking-widest uppercase mb-4">
			{children}
		</p>
	);
}

function Field({ label, value }: { label: string; value?: string | null }) {
	return (
		<div>
			<p className="text-[10px] text-[#7A7268] uppercase tracking-wider mb-0.5">
				{label}
			</p>
			<p className="text-sm text-[#1C1A17]">
				{value && value.trim() ? value : "Not provided"}
			</p>
		</div>
	);
}

function ReviewSection({
	title,
	editTo,
	children,
}: {
	title: string;
	editTo: string;
	children: React.ReactNode;
}) {
	return (
		<div>
			<div className="flex items-center justify-between mb-3 gap-3">
				<SectionLabel>{title}</SectionLabel>
				<Button
					asChild
					variant="ghost-muted"
					size="sm"
					className="h-auto px-0 py-0 text-sm font-medium"
				>
					<Link to={editTo}>Edit</Link>
				</Button>
			</div>
			<div className="bg-white rounded-2xl p-5 shadow-[0_1px_4px_rgba(28,26,23,0.07)]">
				{children}
			</div>
		</div>
	);
}

export default function Application({ loaderData }: Route.ComponentProps) {
	const { applicationId, application } = loaderData;
	const navigation = useNavigation();
	const submitting = navigation.state === "submitting";
	const primary = application.residents.find(
		(resident) => resident.role === "primary",
	);
	const otherResidents = application.residents.filter(
		(resident) => resident.role !== "primary",
	);
	const adultResidents = application.residents.filter(
		(resident) => resident.role !== "child",
	);
	const warnings: string[] = [];

	if (!primary?.fullName) warnings.push("Primary applicant name is missing.");
	if (!primary?.dateOfBirth)
		warnings.push("Primary applicant date of birth is missing.");
	if (!primary?.phone)
		warnings.push("Primary applicant phone number is missing.");
	if (!application.desiredMoveInDate)
		warnings.push("Preferred move-in date is missing.");
	if (adultResidents.some((resident) => resident.incomeSources.length === 0)) {
		warnings.push(
			"One or more adult applicants do not have income details yet.",
		);
	}
	if (adultResidents.some((resident) => resident.residences.length === 0)) {
		warnings.push(
			"One or more adult applicants do not have residence history yet.",
		);
	}
	if (application.documents.length === 0) {
		warnings.push("No supporting documents have been uploaded yet.");
	}

	return (
		<>
			<div className="max-w-lg mx-auto px-5 pt-24 pb-40">
				<div className="mt-8 mb-8">
					<p className="text-xs text-[#C4714A] tracking-widest uppercase font-medium mb-3">
						Application #{applicationId}
					</p>
					<h1
						className="text-[1.9rem] leading-[1.15] text-[#1C1A17] mb-3"
						style={{ fontFamily: "'Fraunces', serif", fontWeight: 300 }}
					>
						Review everything before <em>you submit.</em>
					</h1>
					<p className="text-sm text-[#7A7268] leading-relaxed">
						Make sure the details below look right. If anything needs work, jump
						back to that section and update it before submitting.
					</p>
				</div>

				{warnings.length > 0 && (
					<div className="bg-[#FFF8F2] border border-[#F0D5C6] rounded-2xl p-5 mb-6">
						<div className="flex items-start gap-3">
							<div className="mt-0.5 text-[#C4714A]">
								<svg
									aria-hidden="true"
									width="16"
									height="16"
									viewBox="0 0 16 16"
									fill="none"
									stroke="currentColor"
									strokeWidth="1.6"
									strokeLinecap="round"
									strokeLinejoin="round"
								>
									<path d="M8 1.5l6 11H2l6-11Z" />
									<path d="M8 5.5v3.5M8 11.5h.01" />
								</svg>
							</div>
							<div>
								<p className="text-sm font-medium text-[#1C1A17] mb-2">
									A few things may still need attention
								</p>
								<ul className="text-sm text-[#7A7268] space-y-1">
									{warnings.map((warning) => (
										<li key={warning}>{warning}</li>
									))}
								</ul>
							</div>
						</div>
					</div>
				)}

				<div className="space-y-5">
					<ReviewSection
						title="Application"
						editTo={`/a/applications/${applicationId}/applicant`}
					>
						<div className="grid grid-cols-2 gap-4">
							<Field
								label="Status"
								value={
									application.status.charAt(0).toUpperCase() +
									application.status.slice(1)
								}
							/>
							<Field
								label="Move-in date"
								value={formatDate(application.desiredMoveInDate)}
							/>
							<Field
								label="Smoking"
								value={application.smokes ? "Yes" : "No"}
							/>
							<Field label="Notes" value={application.notes} />
						</div>
					</ReviewSection>

					<ReviewSection
						title="Primary Applicant"
						editTo={`/a/applications/${applicationId}/applicant`}
					>
						{primary ? (
							<div className="grid grid-cols-2 gap-4">
								<Field label="Name" value={primary.fullName} />
								<Field
									label="Date of birth"
									value={formatDate(primary.dateOfBirth)}
								/>
								<Field label="Email" value={primary.email} />
								<Field label="Phone" value={primary.phone} />
							</div>
						) : (
							<p className="text-sm text-[#7A7268]">
								Primary applicant details have not been added yet.
							</p>
						)}
					</ReviewSection>

					<ReviewSection
						title="Occupants"
						editTo={`/a/applications/${applicationId}/occupants`}
					>
						{otherResidents.length > 0 ? (
							<div className="space-y-4">
								{otherResidents.map((resident) => (
									<div
										key={resident.id}
										className="border border-[#F0EBE3] rounded-xl p-4"
									>
										<p className="text-[10px] text-[#7A7268] uppercase tracking-wider mb-3">
											{ROLE_LABELS[resident.role] ?? resident.role}
										</p>
										<div className="grid grid-cols-2 gap-4">
											<Field label="Name" value={resident.fullName} />
											<Field
												label="Date of birth"
												value={formatDate(resident.dateOfBirth)}
											/>
											{resident.role !== "child" && (
												<Field label="Email" value={resident.email} />
											)}
										</div>
									</div>
								))}
							</div>
						) : (
							<p className="text-sm text-[#7A7268]">
								No additional occupants were added.
							</p>
						)}
					</ReviewSection>

					<ReviewSection
						title="Income"
						editTo={`/a/applications/${applicationId}/income`}
					>
						<div className="space-y-4">
							{adultResidents.map((resident) => (
								<div
									key={resident.id}
									className="border border-[#F0EBE3] rounded-xl p-4"
								>
									<p className="text-sm font-medium text-[#1C1A17] mb-3">
										{resident.fullName}
									</p>
									{resident.incomeSources.length > 0 ? (
										<div className="space-y-3">
											{resident.incomeSources.map((source) => (
												<div key={source.id} className="grid grid-cols-2 gap-4">
													<Field
														label="Type"
														value={
															INCOME_TYPE_LABELS[source.type] ?? source.type
														}
													/>
													<Field
														label="Monthly amount"
														value={formatCurrency(source.monthlyAmountCents)}
													/>
													<Field
														label="Source"
														value={source.employerOrSourceName}
													/>
													<Field
														label="Title or occupation"
														value={source.titleOrOccupation}
													/>
												</div>
											))}
										</div>
									) : (
										<p className="text-sm text-[#7A7268]">
											No income details added yet.
										</p>
									)}
								</div>
							))}
						</div>
					</ReviewSection>

					<ReviewSection
						title="Residence"
						editTo={`/a/applications/${applicationId}/residence`}
					>
						<div className="space-y-4">
							{adultResidents.map((resident) => (
								<div
									key={resident.id}
									className="border border-[#F0EBE3] rounded-xl p-4"
								>
									<p className="text-sm font-medium text-[#1C1A17] mb-3">
										{resident.fullName}
									</p>
									{resident.residences.length > 0 ? (
										<div className="space-y-3">
											{resident.residences.map((residence) => (
												<div
													key={residence.id}
													className="grid grid-cols-2 gap-4"
												>
													<div className="col-span-2">
														<Field label="Address" value={residence.address} />
													</div>
													<Field
														label="From"
														value={formatDate(residence.fromDate)}
													/>
													<Field
														label="To"
														value={
															residence.toDate
																? formatDate(residence.toDate)
																: "Present"
														}
													/>
													<Field
														label="Rental"
														value={residence.isRental ? "Yes" : "No"}
													/>
													<Field
														label="Reason for leaving"
														value={residence.reasonForLeaving}
													/>
													{residence.isRental && (
														<>
															<Field
																label="Landlord name"
																value={residence.landlordName}
															/>
															<Field
																label="Landlord phone"
																value={residence.landlordPhone}
															/>
														</>
													)}
												</div>
											))}
										</div>
									) : (
										<p className="text-sm text-[#7A7268]">
											No residence history added yet.
										</p>
									)}
								</div>
							))}
						</div>
					</ReviewSection>

					<ReviewSection
						title="Pets"
						editTo={`/a/applications/${applicationId}/occupants`}
					>
						{application.pets.length > 0 ? (
							<div className="space-y-4">
								{application.pets.map((pet) => (
									<div
										key={pet.id}
										className="border border-[#F0EBE3] rounded-xl p-4"
									>
										<div className="grid grid-cols-2 gap-4">
											<Field label="Type" value={pet.type} />
											<Field label="Name" value={pet.name} />
											<Field label="Breed" value={pet.breed} />
											<Field label="Notes" value={pet.notes} />
										</div>
									</div>
								))}
							</div>
						) : (
							<p className="text-sm text-[#7A7268]">No pets listed.</p>
						)}
					</ReviewSection>

					<ReviewSection
						title="Documents"
						editTo={`/a/applications/${applicationId}/documents`}
					>
						{application.documents.length > 0 ? (
							<div className="space-y-4">
								{adultResidents.map((resident) => {
									const residentDocuments = application.documents.filter(
										(document) => document.residentId === resident.id,
									);

									if (residentDocuments.length === 0) {
										return (
											<div
												key={resident.id}
												className="border border-[#F0EBE3] rounded-xl p-4"
											>
												<p className="text-sm font-medium text-[#1C1A17] mb-1">
													{resident.fullName}
												</p>
												<p className="text-sm text-[#7A7268]">
													No documents uploaded yet.
												</p>
											</div>
										);
									}

									return (
										<div
											key={resident.id}
											className="border border-[#F0EBE3] rounded-xl p-4"
										>
											<p className="text-sm font-medium text-[#1C1A17] mb-3">
												{resident.fullName}
											</p>
											<div className="space-y-2">
												{residentDocuments.map((document) => (
													<div
														key={document.id}
														className="flex items-center justify-between gap-3 text-sm"
													>
														<span className="text-[#1C1A17]">
															{DOCUMENT_TYPE_LABELS[document.documentType] ??
																document.documentType}
														</span>
														<span className="text-[#7A7268] capitalize">
															{document.status.replaceAll("_", " ")}
														</span>
													</div>
												))}
											</div>
										</div>
									);
								})}
							</div>
						) : (
							<p className="text-sm text-[#7A7268]">
								No supporting documents have been uploaded yet.
							</p>
						)}
					</ReviewSection>
				</div>
			</div>

			<div className="fixed bottom-0 left-0 right-0 pointer-events-none z-20">
				<div className="bg-gradient-to-t from-[#F5F0E8] via-[#F5F0E8]/95 to-transparent pt-8 pb-10 px-5 pointer-events-auto">
					<div className="max-w-lg mx-auto">
						{application.status === "pending" ? (
							<Form method="post">
								<Button variant="continue" type="submit" disabled={submitting}>
									{submitting ? "Submitting..." : "Submit application"}
								</Button>
							</Form>
						) : (
							<div className="bg-white rounded-2xl p-4 text-center shadow-[0_1px_4px_rgba(28,26,23,0.07)]">
								<p className="text-sm text-[#1C1A17]">
									This application has already been submitted.
								</p>
							</div>
						)}
						<p className="text-center text-xs text-[#7A7268] mt-3">
							You can still return to any section above before submitting.
						</p>
					</div>
				</div>
			</div>
		</>
	);
}
