import type {
	ApplicationDocumentDetail,
	ApplicationWithDetails,
	ResidenceDetail,
} from "api";
import { useEffect, useRef, useState } from "react";
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
	const [activeFileAction, setActiveFileAction] = useState<string | null>(null);
	const previewUrlsRef = useRef<string[]>([]);

	useEffect(() => {
		return () => {
			for (const url of previewUrlsRef.current) {
				URL.revokeObjectURL(url);
			}
		};
	}, []);

	const fetchDocumentBlob = async (fileId: string) => {
		const response = await fetch(
			`${BASE_API_URL}/landlord/applications/${applicationId}/files/${fileId}`,
			{ credentials: "include" },
		);

		if (!response.ok) {
			throw new Error(`File request failed with status ${response.status}`);
		}

		return response.blob();
	};

	const handleView = async (doc: ApplicationDocumentDetail) => {
		const previewWindow = window.open("", "_blank");

		if (!previewWindow) {
			window.alert("Unable to open the document preview.");
			return;
		}

		previewWindow.opener = null;
		previewWindow.document.title = doc.originalFilename;
		previewWindow.document.body.textContent = "Loading document...";
		setActiveFileAction(`view:${doc.fileId}`);

		try {
			const blob = await fetchDocumentBlob(doc.fileId);
			const previewUrl = URL.createObjectURL(blob);
			previewUrlsRef.current.push(previewUrl);
			previewWindow.location.replace(previewUrl);
		} catch {
			previewWindow.close();
			window.alert("Unable to open the document.");
		} finally {
			setActiveFileAction((current) =>
				current === `view:${doc.fileId}` ? null : current,
			);
		}
	};

	const handleDownload = async (doc: ApplicationDocumentDetail) => {
		setActiveFileAction(`download:${doc.fileId}`);

		try {
			const blob = await fetchDocumentBlob(`${doc.fileId}?download=true`);
			const downloadUrl = URL.createObjectURL(blob);
			const link = document.createElement("a");

			link.href = downloadUrl;
			link.download = doc.originalFilename;
			document.body.append(link);
			link.click();
			link.remove();

			window.setTimeout(() => {
				URL.revokeObjectURL(downloadUrl);
			}, 1000);
		} catch {
			window.alert("Unable to download the document.");
		} finally {
			setActiveFileAction((current) =>
				current === `download:${doc.fileId}` ? null : current,
			);
		}
	};

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
									const isDownloading =
										activeFileAction === `download:${doc.fileId}`;
									const isViewing = activeFileAction === `view:${doc.fileId}`;
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
												<button
													type="button"
													onClick={() => void handleDownload(doc)}
													disabled={isDownloading || isViewing}
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
														{isDownloading
															? `Downloading ${doc.originalFilename}`
															: `Download ${doc.originalFilename}`}
													</span>
												</button>
											</div>
											<button
												type="button"
												onClick={() => void handleView(doc)}
												disabled={isDownloading || isViewing}
												className="mt-2 flex items-center justify-center w-full h-9 rounded-lg bg-[#C4714A] text-white text-xs font-medium active:bg-[#A85A36] transition-colors"
											>
												{isViewing ? "Opening..." : "View"}
											</button>
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

type ActionMode = "idle" | "approve" | "reject" | "request-info";

const STATUS_STYLES: Record<
	string,
	{ bg: string; color: string; dot: string; label: string }
> = {
	draft: {
		bg: "#F5F0E8",
		color: "#7A7268",
		dot: "#B0A89E",
		label: "Draft",
	},
	pending: {
		bg: "#FFF3EE",
		color: "#C4714A",
		dot: "#C4714A",
		label: "Pending",
	},
	submitted: {
		bg: "#EEF1F8",
		color: "#4A6C9B",
		dot: "#4A6C9B",
		label: "Submitted",
	},
	approved: {
		bg: "#EDFAF4",
		color: "#2E8A58",
		dot: "#2E8A58",
		label: "Approved",
	},
	rejected: {
		bg: "#FFF0F0",
		color: "#C44A4A",
		dot: "#C44A4A",
		label: "Rejected",
	},
	info_requested: {
		bg: "#FFF9EE",
		color: "#A0742A",
		dot: "#C4974A",
		label: "Info Requested",
	},
};

function StatusBadge({ status }: { status: string }) {
	const s = STATUS_STYLES[status] ?? STATUS_STYLES.pending;
	return (
		<span
			className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
			style={{ background: s.bg, color: s.color }}
		>
			<span
				className="size-1.5 rounded-full"
				style={{ background: s.dot }}
				aria-hidden="true"
			/>
			{s.label}
		</span>
	);
}

function ActionSheet({
	mode,
	applicantName,
	onClose,
	onConfirm,
}: {
	mode: ActionMode;
	applicantName: string;
	onClose: () => void;
	onConfirm: (note: string) => void;
}) {
	const [note, setNote] = useState("");
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const open = mode !== "idle";

	const isRequestInfo = mode === "request-info";
	const isApprove = mode === "approve";
	const isReject = mode === "reject";

	const canSubmit = !isRequestInfo || note.trim().length > 0;

	const config = {
		approve: {
			heading: "Approve application",
			subtext: `Approve ${applicantName}'s application. They'll be notified right away.`,
			notePlaceholder: "Add a message for the applicant (optional)",
			noteLabel: "Message for applicant",
			noteRequired: false,
			ctaLabel: "Approve application",
			ctaBg: "#2E8A58",
			ctaHover: "#236B45",
			ctaText: "#FFFFFF",
		},
		reject: {
			heading: "Decline application",
			subtext: `Let ${applicantName} know you've reviewed and declined their application.`,
			notePlaceholder: "Let them know why (optional but kind)",
			noteLabel: "Reason for declining",
			noteRequired: false,
			ctaLabel: "Decline application",
			ctaBg: "#C44A4A",
			ctaHover: "#A83B3B",
			ctaText: "#FFFFFF",
		},
		"request-info": {
			heading: "Need more information",
			subtext: `Tell ${applicantName} exactly what you need to move forward.`,
			notePlaceholder:
				"e.g. Please provide the last 3 months of bank statements and a reference from your previous landlord.",
			noteLabel: "What do you need?",
			noteRequired: true,
			ctaLabel: "Send request",
			ctaBg: "#1C1A17",
			ctaHover: "#2E2B27",
			ctaText: "#FFFFFF",
		},
	}[mode === "idle" ? "approve" : mode];

	// Auto-focus textarea when sheet opens
	const handleSheetOpen = () => {
		setTimeout(() => textareaRef.current?.focus(), 300);
	};

	if (!open) return null;

	return (
		<>
			<style>{`
        @keyframes as-fade-in {
          from { opacity: 0 }
          to   { opacity: 1 }
        }
        @keyframes as-slide-up {
          from { transform: translateY(100%) }
          to   { transform: translateY(0) }
        }
        .as-backdrop { animation: as-fade-in 200ms ease both }
        .as-sheet    { animation: as-slide-up 280ms cubic-bezier(0.32, 0.72, 0, 1) both }
      `}</style>
			{/* Backdrop */}
			<div
				className="as-backdrop fixed inset-0 z-40 bg-[#1C1A17]/30 backdrop-blur-[3px]"
				onClick={onClose}
				aria-hidden="true"
			/>
			{/* Sheet */}
			<div
				className="as-sheet fixed bottom-0 left-0 right-0 z-50 max-w-lg mx-auto"
				onAnimationEnd={handleSheetOpen}
			>
				<div
					className="rounded-t-[28px] px-5 pt-3 pb-8"
					style={{ background: "#FAF7F2" }}
				>
					{/* Drag handle */}
					<div className="flex justify-center mb-5">
						<div className="w-9 h-1 rounded-full bg-[#D9D1C7]" />
					</div>

					{/* Icon */}
					<div className="mb-4">
						{isApprove && (
							<div
								className="w-10 h-10 rounded-2xl flex items-center justify-center"
								style={{ background: "#EDFAF4" }}
							>
								<svg
									width="20"
									height="20"
									viewBox="0 0 20 20"
									fill="none"
									aria-hidden="true"
								>
									<path
										d="M4.5 10.5L8.5 14.5L15.5 6.5"
										stroke="#2E8A58"
										strokeWidth="1.6"
										strokeLinecap="round"
										strokeLinejoin="round"
									/>
								</svg>
							</div>
						)}
						{isReject && (
							<div
								className="w-10 h-10 rounded-2xl flex items-center justify-center"
								style={{ background: "#FFF0F0" }}
							>
								<svg
									width="20"
									height="20"
									viewBox="0 0 20 20"
									fill="none"
									aria-hidden="true"
								>
									<path
										d="M6.5 6.5L13.5 13.5M13.5 6.5L6.5 13.5"
										stroke="#C44A4A"
										strokeWidth="1.6"
										strokeLinecap="round"
									/>
								</svg>
							</div>
						)}
						{isRequestInfo && (
							<div
								className="w-10 h-10 rounded-2xl flex items-center justify-center"
								style={{ background: "#FFF9EE" }}
							>
								<svg
									width="20"
									height="20"
									viewBox="0 0 20 20"
									fill="none"
									aria-hidden="true"
								>
									<circle
										cx="10"
										cy="10"
										r="7.5"
										stroke="#C4974A"
										strokeWidth="1.5"
									/>
									<path
										d="M10 9v5"
										stroke="#C4974A"
										strokeWidth="1.6"
										strokeLinecap="round"
									/>
									<circle cx="10" cy="6.5" r="0.75" fill="#C4974A" />
								</svg>
							</div>
						)}
					</div>

					{/* Heading */}
					<h2
						className="text-[1.35rem] text-[#1C1A17] leading-snug mb-1"
						style={{ fontFamily: "'Fraunces', serif", fontWeight: 400 }}
					>
						{config.heading}
					</h2>
					<p className="text-sm text-[#7A7268] mb-5 leading-relaxed">
						{config.subtext}
					</p>

					{/* Note field */}
					<div className="mb-5">
						<label className="block text-[10px] text-[#7A7268] uppercase tracking-wider mb-1.5">
							{config.noteLabel}
							{config.noteRequired && (
								<span className="text-[#C4714A] ml-0.5">*</span>
							)}
						</label>
						<textarea
							ref={textareaRef}
							value={note}
							onChange={(e) => setNote(e.target.value)}
							placeholder={config.notePlaceholder}
							rows={isRequestInfo ? 4 : 3}
							className="w-full rounded-xl border-2 border-[#E8E1D9] px-4 py-3 text-sm text-[#1C1A17] placeholder:text-[#C0B8AF] resize-none focus:outline-none focus:border-[#C4714A] transition-colors leading-relaxed"
							style={{ background: "#FEFCF9" }}
						/>
					</div>

					{/* CTA */}
					<button
						type="button"
						disabled={!canSubmit}
						onClick={() => onConfirm(note.trim())}
						className="w-full h-13 rounded-2xl text-sm font-medium tracking-wide transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
						style={{
							background: canSubmit ? config.ctaBg : "#D9D1C7",
							color: config.ctaText,
							minHeight: "52px",
						}}
					>
						{config.ctaLabel}
					</button>

					{/* Cancel */}
					<button
						type="button"
						onClick={onClose}
						className="w-full mt-3 h-11 rounded-2xl text-sm text-[#7A7268] transition-colors active:bg-[#EDE8E1]"
					>
						Cancel
					</button>
				</div>
			</div>
		</>
	);
}

function ApplicationActionBar({
	status,
	applicantName,
	onAction,
}: {
	status: string;
	applicantName: string;
	onAction: (
		action: "approve" | "reject" | "request-info",
		note: string,
	) => Promise<void>;
}) {
	const [mode, setMode] = useState<ActionMode>("idle");
	const [, setSubmitting] = useState(false);

	const isDecided =
		status === "approved" ||
		status === "rejected" ||
		status === "info_requested";
	const isSubmitted = status === "submitted";

	if (!isSubmitted && !isDecided) return null;

	const s = STATUS_STYLES[status];

	return (
		<>
			<ActionSheet
				mode={mode}
				applicantName={applicantName}
				onClose={() => setMode("idle")}
				onConfirm={async (note) => {
					if (mode !== "idle") {
						setSubmitting(true);
						await onAction(mode, note);
						setSubmitting(false);
						setMode("idle");
					}
				}}
			/>

			{/* Outer fixed strip — transparent on desktop so only the card shows */}
			<div className="fixed bottom-0 left-0 right-0 z-30 flex justify-center">
				<div
					className="w-full max-w-lg sm:rounded-t-3xl sm:mx-5 sm:shadow-[0_-2px_24px_rgba(28,26,23,0.10)]"
					style={{
						background: "rgba(250,247,242,0.97)",
						backdropFilter: "blur(12px)",
						WebkitBackdropFilter: "blur(12px)",
						borderTop: "1px solid #E8E1D9",
					}}
				>
					<div className="px-5 pt-4 pb-8 sm:pb-6">
						{isSubmitted && (
							<>
								{/* "Need more info" — clearly a button */}
								<button
									type="button"
									onClick={() => setMode("request-info")}
									className="w-full mb-3 flex items-center justify-center gap-2 h-11 rounded-2xl text-sm font-medium transition-all active:scale-[0.98] border"
									style={{
										color: "#A0742A",
										borderColor: "#DEC98A",
										background: "#FFFBF2",
									}}
								>
									<svg
										width="15"
										height="15"
										viewBox="0 0 15 15"
										fill="none"
										aria-hidden="true"
									>
										<circle
											cx="7.5"
											cy="7.5"
											r="6"
											stroke="currentColor"
											strokeWidth="1.25"
										/>
										<path
											d="M7.5 6.75v4"
											stroke="currentColor"
											strokeWidth="1.3"
											strokeLinecap="round"
										/>
										<circle cx="7.5" cy="4.75" r="0.65" fill="currentColor" />
									</svg>
									Need more information
								</button>

								{/* Primary binary actions */}
								<div className="grid grid-cols-2 gap-3">
									<button
										type="button"
										onClick={() => setMode("reject")}
										className="rounded-2xl text-sm font-medium transition-all active:scale-[0.98] border-2 border-[#E8E1D9]"
										style={{
											background: "#FEFCF9",
											color: "#1C1A17",
											minHeight: "52px",
										}}
									>
										Decline
									</button>
									<button
										type="button"
										onClick={() => setMode("approve")}
										className="rounded-2xl text-sm font-medium transition-all active:scale-[0.98]"
										style={{
											background: "#1C1A17",
											color: "#FAFAF9",
											minHeight: "52px",
										}}
									>
										Approve
									</button>
								</div>
							</>
						)}

						{isDecided && s && (
							<div
								className="flex items-center gap-2.5 px-4 py-3.5 rounded-2xl"
								style={{ background: s.bg }}
							>
								<span
									className="size-2 rounded-full shrink-0"
									style={{ background: s.dot }}
									aria-hidden="true"
								/>
								<span
									className="text-sm font-medium"
									style={{ color: s.color }}
								>
									{s.label}
								</span>
							</div>
						)}
					</div>
				</div>
			</div>
		</>
	);
}

export default function LandlordApplicationDetail({
	loaderData,
}: Route.ComponentProps) {
	const { application } = loaderData;
	const [localStatus, setLocalStatus] = useState(application.status);
	const primary = application.residents.find((r) => r.role === "primary");
	const adultResidents = application.residents.filter(
		(r) => r.role !== "child",
	);

	const applicantName = primary?.fullName ?? `Applicant #${application.id}`;

	const handleAction = async (
		action: "approve" | "reject" | "request-info",
		note: string,
	) => {
		const apiAction =
			action === "approve"
				? "approve"
				: action === "reject"
					? "reject"
					: "request_info";

		const response = await fetch(
			`${BASE_API_URL}/landlord/applications/${application.id}/decision`,
			{
				method: "PATCH",
				credentials: "include",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ action: apiAction, note: note || undefined }),
			},
		);

		if (response.ok) {
			const { status: newStatus } = (await response.json()) as {
				status: string;
			};
			setLocalStatus(newStatus);
		}
	};

	const showActionBar =
		localStatus === "submitted" ||
		localStatus === "approved" ||
		localStatus === "rejected" ||
		localStatus === "info_requested";
	const bottomPadding = showActionBar ? "pb-36" : "pb-12";

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
					<StatusBadge status={localStatus} />
				</div>
			</div>

			{/* Content */}
			<div
				className={`max-w-lg mx-auto px-5 pt-[72px] ${bottomPadding} space-y-4`}
			>
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

			<ApplicationActionBar
				status={localStatus}
				applicantName={applicantName}
				onAction={handleAction}
			/>
		</div>
	);
}
