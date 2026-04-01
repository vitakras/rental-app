import type { ApplicationWithDetails } from "api";
import { Link } from "react-router";
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

function formatDate(dateStr: string): string {
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

function formatCurrency(cents: number): string {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
		maximumFractionDigits: 0,
	}).format(cents / 100);
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
	}[];
}) {
	if (incomeSources.length === 0) return null;
	return (
		<div className="mt-4 pt-4 border-t border-[#F0EBE3]">
			<p className="text-[10px] text-[#7A7268] uppercase tracking-wider mb-3">
				Income
			</p>
			<div className="space-y-3">
				{incomeSources.map((source) => (
					<div key={source.id} className="grid grid-cols-2 gap-3">
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
					</div>
				))}
			</div>
		</div>
	);
}

function SectionHeading({ children }: { children: React.ReactNode }) {
	return (
		<p className="text-[10px] text-[#C4714A] tracking-widest uppercase font-medium mb-3">
			{children}
		</p>
	);
}

function Field({ label, value }: { label: string; value?: string | null }) {
	if (!value) return null;
	return (
		<div>
			<p className="text-[10px] text-[#7A7268] uppercase tracking-wider mb-0.5">
				{label}
			</p>
			<p className="text-sm text-[#1C1A17]">{value}</p>
		</div>
	);
}

export default function LandlordApplicationDetail({
	loaderData,
}: Route.ComponentProps) {
	const { application } = loaderData;
	const primary = application.residents.find((r) => r.role === "primary");
	const otherResidents = application.residents.filter(
		(r) => r.role !== "primary",
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
					</div>
				</div>

				{/* Primary applicant */}
				{primary && (
					<div>
						<SectionHeading>Primary Applicant</SectionHeading>
						<div className="bg-white rounded-2xl p-5 shadow-[0_1px_4px_rgba(28,26,23,0.07)]">
							<div className="grid grid-cols-2 gap-4">
								<Field label="Name" value={primary.fullName} />
								<Field label="Date of birth" value={primary.dateOfBirth} />
								<Field label="Email" value={primary.email} />
								<Field label="Phone" value={primary.phone} />
							</div>
							<IncomeSection incomeSources={primary.incomeSources} />
						</div>
					</div>
				)}

				{/* Other residents */}
				{otherResidents.length > 0 && (
					<div>
						<SectionHeading>Other Residents</SectionHeading>
						<div className="space-y-3">
							{otherResidents.map((resident) => (
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
									</div>
									{resident.role !== "child" && (
										<IncomeSection incomeSources={resident.incomeSources} />
									)}
								</div>
							))}
						</div>
					</div>
				)}

				{/* Pets */}
				{application.pets.length > 0 && (
					<div>
						<SectionHeading>Pets</SectionHeading>
						<div className="space-y-3">
							{application.pets.map((pet) => (
								<div
									key={pet.id}
									className="bg-white rounded-2xl p-5 shadow-[0_1px_4px_rgba(28,26,23,0.07)]"
								>
									<div className="flex items-center gap-2 mb-3">
										<span className="text-base">
											{PET_EMOJI[pet.type] ?? "🐾"}
										</span>
										<p className="text-sm font-medium text-[#1C1A17]">
											{pet.name ?? pet.type}
										</p>
									</div>
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
					</div>
				)}
			</div>
		</div>
	);
}
