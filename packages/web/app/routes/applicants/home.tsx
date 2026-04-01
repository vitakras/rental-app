import { Link, redirect, useSubmit } from "react-router";
import { apiClient } from "~/lib/api";
import type { Route } from "./+types/home";

type ApplicationSummary = {
	id: number;
	status: string;
	desiredMoveInDate: string | null;
	createdAt: string;
	primaryApplicantName: string | null;
};

export function meta() {
	return [{ title: "My Applications — Find Your Home" }];
}

export async function clientLoader() {
	const response = await apiClient.applications.$get();
	if (!response.ok) {
		return { applications: [] as ApplicationSummary[] };
	}
	const { applications } = (await response.json()) as {
		applications: ApplicationSummary[];
	};
	return { applications };
}

export async function clientAction() {
	const response = await apiClient.applications.$post();
	const result = (await response.json()) as { applicationId: number };
	return redirect(`/a/applications/${result.applicationId}/applicant`);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
	const date = new Date(dateStr);
	return date.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

const STATUS_CONFIG: Record<
	string,
	{ label: string; bg: string; text: string; dot: string }
> = {
	draft: {
		label: "Draft",
		bg: "#F5F0E8",
		text: "#7A7268",
		dot: "#7A7268",
	},
	pending: {
		label: "In progress",
		bg: "#FFF3EE",
		text: "#C4714A",
		dot: "#C4714A",
	},
	submitted: {
		label: "Submitted",
		bg: "#EEF1F8",
		text: "#4A6C9B",
		dot: "#4A6C9B",
	},
	approved: {
		label: "Approved",
		bg: "#EDFAF4",
		text: "#2E8A58",
		dot: "#2E8A58",
	},
	rejected: {
		label: "Rejected",
		bg: "#FFF0F0",
		text: "#C44A4A",
		dot: "#C44A4A",
	},
};

function StatusBadge({ status }: { status: string }) {
	const config = STATUS_CONFIG[status] ?? {
		label: status,
		bg: "#F0F0F0",
		text: "#666",
		dot: "#999",
	};
	return (
		<span
			className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
			style={{
				backgroundColor: config.bg,
				color: config.text,
				fontFamily: "'DM Sans', sans-serif",
			}}
		>
			<span
				className="size-1.5 rounded-full shrink-0"
				style={{ backgroundColor: config.dot }}
			/>
			{config.label}
		</span>
	);
}

function ApplicationCard({ application }: { application: ApplicationSummary }) {
	const isInProgress =
		application.status === "draft" || application.status === "pending";
	const href =
		application.status === "draft"
			? `/a/applications/${application.id}/applicant`
			: `/a/applications/${application.id}`;

	return (
		<Link
			to={href}
			className="block bg-white rounded-2xl p-5 shadow-[0_1px_4px_rgba(28,26,23,0.07)] hover:shadow-[0_3px_12px_rgba(28,26,23,0.1)] transition-shadow group"
		>
			<div className="flex items-start justify-between gap-3 mb-3">
				<div className="min-w-0">
					<p
						className="text-[#1C1A17] font-medium text-[15px] truncate"
						style={{ fontFamily: "'DM Sans', sans-serif" }}
					>
						{application.primaryApplicantName ?? "—"}
					</p>
					<p
						className="text-xs text-[#7A7268] mt-0.5"
						style={{ fontFamily: "'DM Sans', sans-serif" }}
					>
						Application #{application.id}
					</p>
				</div>
				<StatusBadge status={application.status} />
			</div>

			<div
				className="flex items-center gap-4 text-xs text-[#7A7268] mb-4"
				style={{ fontFamily: "'DM Sans', sans-serif" }}
			>
				<span className="flex items-center gap-1.5">
					<svg
						width="13"
						height="13"
						viewBox="0 0 13 13"
						fill="none"
						stroke="currentColor"
						strokeWidth="1.25"
						strokeLinecap="round"
						strokeLinejoin="round"
						aria-hidden="true"
					>
						<rect x="1" y="2" width="11" height="10" rx="1.5" />
						<path d="M1 5.5h11M4 1v2M9 1v2" />
					</svg>
					{application.desiredMoveInDate
						? `Move in ${formatDate(application.desiredMoveInDate)}`
						: "Move-in date TBD"}
				</span>
				<span className="flex items-center gap-1.5">
					<svg
						width="13"
						height="13"
						viewBox="0 0 13 13"
						fill="none"
						stroke="currentColor"
						strokeWidth="1.25"
						strokeLinecap="round"
						strokeLinejoin="round"
						aria-hidden="true"
					>
						<circle cx="6.5" cy="6.5" r="5" />
						<path d="M6.5 4v2.5l1.5 1.5" />
					</svg>
					Started {formatDate(application.createdAt)}
				</span>
			</div>

			<div className="flex items-center justify-between">
				<span
					className="text-xs font-medium text-[#C4714A] flex items-center gap-1 group-hover:gap-2 transition-all"
					style={{ fontFamily: "'DM Sans', sans-serif" }}
				>
					{isInProgress ? "Continue application" : "View application"}
					<svg
						width="13"
						height="13"
						viewBox="0 0 13 13"
						fill="none"
						stroke="currentColor"
						strokeWidth="1.5"
						strokeLinecap="round"
						strokeLinejoin="round"
						aria-hidden="true"
					>
						<path d="M3 6.5h7M7 3.5l3 3-3 3" />
					</svg>
				</span>
			</div>
		</Link>
	);
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Home({ loaderData }: Route.ComponentProps) {
	const { applications } = loaderData;
	const hasApplications = applications.length > 0;
	const submit = useSubmit();

	return (
		<div
			className="min-h-screen bg-[#F5F0E8]"
			style={{ fontFamily: "'DM Sans', sans-serif" }}
		>
			{/* ── Top bar ── */}
			<div className="sticky top-0 z-30 bg-[#F5F0E8]/90 backdrop-blur-sm border-b border-[#E8E1D9]">
				<div className="max-w-lg mx-auto px-5 py-4">
					<span
						className="text-[#C4714A] text-sm"
						style={{
							fontFamily: "'Fraunces', serif",
							fontStyle: "italic",
							fontWeight: 300,
						}}
					>
						Find Your Home
					</span>
				</div>
			</div>

			{/* ── Content ── */}
			<div className="max-w-lg mx-auto px-5 pt-8 pb-16">
				{/* Header */}
				<div className="mb-8">
					<p
						className="text-xs text-[#C4714A] tracking-widest uppercase font-medium mb-3"
						style={{ fontFamily: "'DM Sans', sans-serif" }}
					>
						{hasApplications ? "Your applications" : "Get started"}
					</p>
					<h1
						className="text-[2.6rem] leading-[1.15] text-[#1C1A17] mb-3"
						style={{ fontFamily: "'Fraunces', serif", fontWeight: 300 }}
					>
						{hasApplications ? (
							<>
								Here's where
								<br />
								<em>things stand.</em>
							</>
						) : (
							<>
								Ready to find
								<br />
								<em>your home?</em>
							</>
						)}
					</h1>
					<p
						className="text-[#7A7268] text-sm leading-relaxed"
						style={{ fontFamily: "'DM Sans', sans-serif" }}
					>
						{hasApplications
							? `You have ${applications.length} rental application${applications.length > 1 ? "s" : ""}.`
							: "Start your rental application — it only takes a few minutes."}
					</p>
				</div>

				{/* Applications list */}
				{hasApplications ? (
					<div className="space-y-3">
						{applications.map((app) => (
							<ApplicationCard key={app.id} application={app} />
						))}
					</div>
				) : (
					/* Empty state */
					<div className="mt-2">
						<div className="bg-white rounded-2xl p-8 shadow-[0_1px_4px_rgba(28,26,23,0.07)] text-center mb-4">
							<div
								className="w-12 h-12 rounded-full bg-[#FFF3EE] flex items-center justify-center mx-auto mb-4"
								aria-hidden="true"
							>
								<svg
									width="22"
									height="22"
									viewBox="0 0 22 22"
									fill="none"
									stroke="#C4714A"
									strokeWidth="1.5"
									strokeLinecap="round"
									strokeLinejoin="round"
									aria-hidden="true"
								>
									<path d="M3 9.5L11 3l8 6.5V19a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
									<path d="M8 20V13h6v7" />
								</svg>
							</div>
							<p
								className="text-[#1C1A17] font-medium mb-1"
								style={{ fontFamily: "'DM Sans', sans-serif" }}
							>
								No applications yet
							</p>
							<p
								className="text-[#7A7268] text-sm"
								style={{ fontFamily: "'DM Sans', sans-serif" }}
							>
								Your applications will appear here once you begin.
							</p>
						</div>

						<button
							type="button"
							className="w-full h-auto min-h-14 px-5 py-3.5 bg-[#1C1A17] text-[15px] font-semibold text-white hover:bg-[#2D2B28] active:scale-[0.98] tracking-wide rounded-2xl transition-all"
							style={{ fontFamily: "'DM Sans', sans-serif" }}
							onClick={() => submit({}, { method: "post" })}
						>
							Begin Application
						</button>
						<p
							className="text-center text-xs text-[#7A7268] mt-3"
							style={{ fontFamily: "'DM Sans', sans-serif" }}
						>
							Takes about 10 minutes to complete
						</p>
					</div>
				)}
			</div>
		</div>
	);
}
