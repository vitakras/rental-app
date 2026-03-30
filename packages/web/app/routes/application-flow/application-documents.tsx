import type {
	ApplicationDocumentCategory,
	ApplicationDocumentType,
	ApplicationWithDetails,
} from "api";
import { data, useLoaderData, useNavigate } from "react-router";
import { Button } from "~/components/ui/button";
import { useFileUpload } from "~/hooks/use-file-upload";
import { apiClient } from "~/lib/api";
import type { Route } from "./+types/application-documents";

export function meta() {
	return [{ title: "Documents — Rental Application" }];
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface DocumentSlot {
	key: string;
	residentId: number;
	category: ApplicationDocumentCategory;
	documentType: ApplicationDocumentType;
	label: string;
	hint?: string;
}

interface ResidentSlots {
	id: number;
	fullName: string;
	slots: DocumentSlot[];
}

// ── Loader ────────────────────────────────────────────────────────────────────

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
	const id = Number(params.id);
	if (!Number.isInteger(id) || id <= 0) throw data(null, { status: 404 });
	const response = await apiClient.applications[":id"].$get({
		param: { id: String(id) },
	});
	if (response.status === 404) throw data(null, { status: 404 });
	if (!response.ok) throw data(null, { status: response.status });

	const { application } = (await response.json()) as {
		application: ApplicationWithDetails;
	};

	const adults = application.residents.filter((r) => r.role !== "child");

	const residents: ResidentSlots[] = adults.map((resident) => {
		const slots: DocumentSlot[] = [];

		slots.push({
			key: `${resident.id}-government_id`,
			residentId: resident.id,
			category: "identity",
			documentType: "government_id",
			label: "Government ID",
		});

		for (const source of resident.incomeSources) {
			if (source.type === "employment") {
				slots.push({
					key: `${resident.id}-paystub-${source.id}`,
					residentId: resident.id,
					category: "income",
					documentType: "paystub",
					label: "Paystubs",
					hint: source.employerOrSourceName,
				});
				slots.push({
					key: `${resident.id}-employment_letter-${source.id}`,
					residentId: resident.id,
					category: "income",
					documentType: "employment_letter",
					label: "Employment letter",
					hint: source.employerOrSourceName,
				});
			} else if (source.type === "self_employment") {
				slots.push({
					key: `${resident.id}-bank_statement-${source.id}`,
					residentId: resident.id,
					category: "income",
					documentType: "bank_statement",
					label: "Bank statements",
					hint: source.employerOrSourceName,
				});
			} else {
				slots.push({
					key: `${resident.id}-other-${source.id}`,
					residentId: resident.id,
					category: "income",
					documentType: "other",
					label: "Supporting document",
					hint: source.employerOrSourceName,
				});
			}
		}

		return { id: resident.id, fullName: resident.fullName, slots };
	});

	return { applicationId: id, residents };
}

// ── Shared primitives ─────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
	return (
		<p
			className="text-xs text-[#C4714A] font-medium tracking-widest uppercase mb-4"
			style={{ fontFamily: "'DM Sans', sans-serif" }}
		>
			{children}
		</p>
	);
}

// ── Slot card ─────────────────────────────────────────────────────────────────

function SlotCard({
	slot,
	applicationId,
}: {
	slot: DocumentSlot;
	applicationId: number;
}) {
	const { uploadedFiles, uploadFiles } = useFileUpload(applicationId, slot);
	const hasUploads = uploadedFiles.length > 0;

	return (
		<div className="bg-white rounded-2xl p-5 mb-3 shadow-[0_1px_4px_rgba(28,26,23,0.07)]">
			<div className={hasUploads ? "mb-3" : "mb-4"}>
				<p
					className="text-sm font-medium text-[#1C1A17]"
					style={{ fontFamily: "'DM Sans', sans-serif" }}
				>
					{slot.label}
				</p>
				{slot.hint && (
					<p
						className="text-xs text-[#7A7268] mt-0.5"
						style={{ fontFamily: "'DM Sans', sans-serif" }}
					>
						{slot.hint}
					</p>
				)}
			</div>

			{hasUploads && (
				<ul className="mb-3 space-y-1.5">
					{uploadedFiles.map((file) => (
						<li key={file.clientId} className="flex items-center gap-2">
							{file.status === "uploading" && (
								<svg
									aria-hidden="true"
									className="animate-spin text-[#C4714A] flex-shrink-0"
									width="14"
									height="14"
									viewBox="0 0 14 14"
									fill="none"
								>
									<circle
										cx="7"
										cy="7"
										r="5.5"
										stroke="currentColor"
										strokeWidth="1.5"
										strokeDasharray="22"
										strokeDashoffset="8"
										strokeLinecap="round"
									/>
								</svg>
							)}
							{file.status === "done" && (
								<svg
									aria-hidden="true"
									className="text-[#5A9E6F] flex-shrink-0"
									width="14"
									height="14"
									viewBox="0 0 14 14"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
								>
									<path d="M2 7l4 4 6-6" />
								</svg>
							)}
							{file.status === "error" && (
								<svg
									aria-hidden="true"
									className="text-[#C45A4A] flex-shrink-0"
									width="14"
									height="14"
									viewBox="0 0 14 14"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
								>
									<path d="M1 1l12 12M13 1L1 13" />
								</svg>
							)}
							<span
								className={`text-sm truncate max-w-[240px] ${
									file.status === "error" ? "text-[#C45A4A]" : "text-[#1C1A17]"
								}`}
								style={{ fontFamily: "'DM Sans', sans-serif" }}
							>
								{file.status === "error"
									? `${file.filename} — upload failed`
									: file.filename}
							</span>
						</li>
					))}
				</ul>
			)}

			<label className="flex items-center gap-2 text-sm text-[#C4714A] cursor-pointer select-none w-fit">
				<input
					type="file"
					multiple
					className="sr-only"
					onChange={(e) => {
						if (e.target.files?.length) uploadFiles(e.target.files);
						e.target.value = "";
					}}
				/>
				<svg
					aria-hidden="true"
					width="14"
					height="14"
					viewBox="0 0 14 14"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
				>
					<path d="M7 1v12M1 7h12" />
				</svg>
				<span style={{ fontFamily: "'DM Sans', sans-serif" }}>
					{hasUploads ? "Add more" : "Add document"}
				</span>
			</label>
		</div>
	);
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ApplicationDocuments() {
	const { applicationId, residents } = useLoaderData<typeof clientLoader>();
	const navigate = useNavigate();

	return (
		<div
			className="min-h-screen bg-[#F5F0E8]"
			style={{ fontFamily: "'DM Sans', sans-serif" }}
		>
			{/* ── Fixed top bar ── */}
			<div className="fixed top-0 left-0 right-0 z-30">
				<div className="h-[3px] bg-[#E8E1D9]">
					<div className="h-full bg-[#C4714A]" style={{ width: "100%" }} />
				</div>
				<div className="bg-[#F5F0E8]/90 backdrop-blur-sm">
					<div className="max-w-lg mx-auto px-5 py-3 flex items-center justify-between">
						<Button
							type="button"
							variant="ghost-muted"
							size="sm"
							className="gap-1 py-1"
							onClick={() => history.back()}
						>
							<svg
								aria-hidden="true"
								width="16"
								height="16"
								viewBox="0 0 16 16"
								fill="none"
								stroke="currentColor"
								strokeWidth="1.5"
								strokeLinecap="round"
								strokeLinejoin="round"
							>
								<path d="M10 12L6 8l4-4" />
							</svg>
							Back
						</Button>
						<span
							className="text-xs text-[#7A7268] tracking-widest uppercase"
							style={{ fontFamily: "'DM Sans', sans-serif" }}
						>
							Step 4 of 4
						</span>
						<div className="w-12" />
					</div>
				</div>
			</div>

			{/* ── Scrollable content ── */}
			<div className="max-w-lg mx-auto px-5 pt-[72px] pb-36">
				{/* Heading */}
				<div className="mt-8 mb-8">
					<p
						className="text-xs text-[#C4714A] tracking-widest uppercase font-medium mb-3"
						style={{ fontFamily: "'DM Sans', sans-serif" }}
					>
						Rental Application · #{applicationId}
					</p>
					<h1
						className="text-[2.6rem] leading-[1.15] text-[#1C1A17] mb-3"
						style={{ fontFamily: "'Fraunces', serif", fontWeight: 300 }}
					>
						Upload your
						<br />
						<em>documents.</em>
					</h1>
					<p
						className="text-[#7A7268] text-sm leading-relaxed"
						style={{ fontFamily: "'DM Sans', sans-serif" }}
					>
						All documents are optional — you can add more after submitting.
					</p>
				</div>

				{/* ── Per-resident sections ── */}
				{residents.map((resident) => (
					<div key={resident.id}>
						{residents.length > 1 && (
							<SectionLabel>{resident.fullName}</SectionLabel>
						)}
						{resident.slots.map((slot) => (
							<SlotCard
								key={slot.key}
								slot={slot}
								applicationId={applicationId}
							/>
						))}
					</div>
				))}
			</div>

			{/* ── Fixed footer CTA ── */}
			<div className="fixed bottom-0 left-0 right-0 pointer-events-none z-20">
				<div className="bg-gradient-to-t from-[#F5F0E8] via-[#F5F0E8]/95 to-transparent pt-8 pb-10 px-5 pointer-events-auto">
					<div className="max-w-lg mx-auto">
						<Button
							variant="continue"
							type="button"
							onClick={() => navigate(`/applications/${applicationId}`)}
						>
							Continue
						</Button>
						<p
							className="text-center text-xs text-[#7A7268] mt-3"
							style={{ fontFamily: "'DM Sans', sans-serif" }}
						>
							You can skip this step and add documents later
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}
