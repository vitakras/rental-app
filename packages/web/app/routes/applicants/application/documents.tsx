import type {
	ApplicationDocumentCategory,
	ApplicationDocumentType,
	ApplicationWithDetails,
} from "api";
import { data, useLoaderData, useNavigate } from "react-router";
import { Button } from "~/components/ui/button";
import { type ExistingFile, useFileUpload } from "~/hooks/use-file-upload";
import { apiClient } from "~/lib/api";
import type { Route } from "./+types/documents";

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
	existingFiles: ExistingFile[];
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

	const existingByResidentAndType = new Map<string, ExistingFile[]>();
	for (const doc of application.documents) {
		const key = `${doc.residentId}-${doc.documentType}`;
		const bucket = existingByResidentAndType.get(key) ?? [];
		bucket.push({ fileId: doc.fileId, filename: doc.originalFilename });
		existingByResidentAndType.set(key, bucket);
	}

	const getExisting = (
		residentId: number,
		documentType: ApplicationDocumentType,
	): ExistingFile[] =>
		existingByResidentAndType.get(`${residentId}-${documentType}`) ?? [];

	const residents: ResidentSlots[] = adults.map((resident) => {
		const slots: DocumentSlot[] = [];

		slots.push({
			key: `${resident.id}-government_id`,
			residentId: resident.id,
			category: "identity",
			documentType: "government_id",
			label: "Government ID",
			existingFiles: getExisting(resident.id, "government_id"),
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
					existingFiles: getExisting(resident.id, "paystub"),
				});
				slots.push({
					key: `${resident.id}-employment_letter-${source.id}`,
					residentId: resident.id,
					category: "income",
					documentType: "employment_letter",
					label: "Employment letter",
					hint: source.employerOrSourceName,
					existingFiles: getExisting(resident.id, "employment_letter"),
				});
			} else if (source.type === "self_employment") {
				slots.push({
					key: `${resident.id}-bank_statement-${source.id}`,
					residentId: resident.id,
					category: "income",
					documentType: "bank_statement",
					label: "Bank statements",
					hint: source.employerOrSourceName,
					existingFiles: getExisting(resident.id, "bank_statement"),
				});
			} else {
				slots.push({
					key: `${resident.id}-other-${source.id}`,
					residentId: resident.id,
					category: "income",
					documentType: "other",
					label: "Supporting document",
					hint: source.employerOrSourceName,
					existingFiles: getExisting(resident.id, "other"),
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
	const { uploadedFiles, uploadFiles, removeFile, retryFile } = useFileUpload(
		applicationId,
		slot,
		slot.existingFiles,
	);
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
					{uploadedFiles.map((file) => {
						if (file.status === "error") {
							return (
								<li
									key={file.clientId}
									className="rounded-xl bg-[#FDF0EE] border border-[#F0C4BC] px-3 py-2.5"
								>
									<div className="flex items-start gap-2.5">
										<svg
											aria-hidden="true"
											className="text-[#C45A4A] flex-shrink-0 mt-0.5"
											width="14"
											height="14"
											viewBox="0 0 14 14"
											fill="none"
										>
											<circle cx="7" cy="7" r="6.5" fill="#C45A4A" fillOpacity="0.12" stroke="#C45A4A" strokeWidth="1.25" />
											<path d="M7 4v3.5M7 9.5v.5" stroke="#C45A4A" strokeWidth="1.5" strokeLinecap="round" />
										</svg>
										<div className="flex-1 min-w-0">
											<p
												className="text-xs font-medium text-[#9B3E31] truncate"
												style={{ fontFamily: "'DM Sans', sans-serif" }}
											>
												{file.filename}
											</p>
											<p
												className="text-xs text-[#B05040] mt-0.5"
												style={{ fontFamily: "'DM Sans', sans-serif" }}
											>
												{file.errorMessage ?? "Upload failed."}
											</p>
										</div>
										<div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
											<button
												type="button"
												onClick={() => retryFile(file.clientId)}
												className="text-xs font-medium text-[#C45A4A] hover:text-[#9B3E31] transition-colors underline underline-offset-2"
												style={{ fontFamily: "'DM Sans', sans-serif" }}
											>
												Retry
											</button>
											<button
												type="button"
												aria-label="Dismiss"
												onClick={() => removeFile(file.clientId)}
												className="text-[#C45A4A] hover:text-[#9B3E31] transition-colors"
											>
												<svg
													aria-hidden="true"
													width="12"
													height="12"
													viewBox="0 0 12 12"
													fill="none"
													stroke="currentColor"
													strokeWidth="2"
													strokeLinecap="round"
												>
													<path d="M1 1l10 10M11 1L1 11" />
												</svg>
											</button>
										</div>
									</div>
								</li>
							);
						}

						return (
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
								<span
									className="text-sm truncate max-w-[240px] text-[#1C1A17]"
									style={{ fontFamily: "'DM Sans', sans-serif" }}
								>
									{file.filename}
								</span>
								{file.status === "done" && (
									<button
										type="button"
										aria-label="Remove"
										onClick={() => removeFile(file.clientId)}
										className="ml-auto flex-shrink-0 text-[#7A7268] hover:text-[#C45A4A] transition-colors"
									>
										<svg
											aria-hidden="true"
											width="12"
											height="12"
											viewBox="0 0 12 12"
											fill="none"
											stroke="currentColor"
											strokeWidth="2"
											strokeLinecap="round"
										>
											<path d="M1 1l10 10M11 1L1 11" />
										</svg>
									</button>
								)}
							</li>
						);
					})}
				</ul>
			)}

			<label className="flex items-center gap-2 text-sm text-[#C4714A] cursor-pointer select-none w-fit">
				<input
					type="file"
					multiple
					accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
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
		<>
			{/* ── Scrollable content ── */}
			<div className="max-w-lg mx-auto px-5 pt-24 pb-36">
				{/* Heading */}
				<div className="mt-8 mb-8">
					<h1
						className="text-[1.55rem] leading-[1.25] text-[#1C1A17] mb-3"
						style={{ fontFamily: "'Fraunces', serif", fontWeight: 300 }}
					>
						Upload your <em>documents.</em>
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
							onClick={() => navigate(`/a/applications/${applicationId}`)}
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
		</>
	);
}
