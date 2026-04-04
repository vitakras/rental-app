import type {
	ApplicationDocumentCategory,
	ApplicationDocumentType,
	ApplicationWithDetails,
} from "api";
import { useEffect, useRef, useState } from "react";
import { data, useFetcher, useLoaderData, useNavigate } from "react-router";
import { Button } from "~/components/ui/button";
import { apiClient } from "~/lib/api";
import {
	ACCEPT_ATTRIBUTE,
	validateFile,
	validationMessage,
} from "~/lib/upload-validation";
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

interface ExistingFile {
	fileId: string;
	filename: string;
}

interface ResidentSlots {
	id: number;
	fullName: string;
	slots: DocumentSlot[];
}

interface SlotFileEntry {
	clientId: string;
	filename: string;
	file?: File;
	fileId?: string;
	isExisting: boolean;
}

type UploadSuccess = { ok: true; fileId: string };
type UploadFailure = { ok: false; errorMessage: string };
type ClientActionResult = UploadSuccess | UploadFailure | { ok: true };

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

// ── Action ────────────────────────────────────────────────────────────────────

export async function clientAction({
	request,
	params,
}: Route.ClientActionArgs): Promise<ClientActionResult> {
	const id = Number(params.id);
	if (!Number.isInteger(id) || id <= 0) throw data(null, { status: 404 });

	const formData = await request.formData();
	const intent = formData.get("intent") as string;

	if (intent === "delete") {
		const fileId = formData.get("fileId") as string;
		await apiClient.applications[":id"].documents[":fileId"].$delete({
			param: { id: String(id), fileId },
		});
		return { ok: true };
	}

	// intent === "upload"
	const file = formData.get("file") as File;

	const failure = validateFile(file);
	if (failure) {
		return { ok: false, errorMessage: validationMessage(failure) };
	}

	const res = await apiClient.applications[":id"].documents.$post(
		{ param: { id: String(id) } },
		{ init: { body: formData } },
	);

	if (!res.ok) {
		const payload = (await res.json().catch(() => null)) as {
			error?: string;
		} | null;
		if (payload?.error === "file_too_large") {
			return { ok: false, errorMessage: "File must be 10 MB or smaller." };
		}
		if (payload?.error === "unsupported_file_type") {
			return {
				ok: false,
				errorMessage: "Only PDF, PNG, and JPG files are allowed.",
			};
		}
		return { ok: false, errorMessage: "Upload failed. Please try again." };
	}

	const { fileId } = (await res.json()) as { fileId: string };
	return { ok: true, fileId };
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

// ── File row ──────────────────────────────────────────────────────────────────

function FileRow({
	entry,
	applicationId: _applicationId,
	slot,
	onRemove,
}: {
	entry: SlotFileEntry;
	applicationId: number;
	slot: Pick<DocumentSlot, "residentId" | "category" | "documentType">;
	onRemove: (clientId: string) => void;
}) {
	const fetcher = useFetcher<typeof clientAction>({
		key: `file-${entry.clientId}`,
	});
	const uploadedRef = useRef(false);

	// biome-ignore lint/correctness/useExhaustiveDependencies: intentional one-shot effect on mount
	useEffect(() => {
		if (!entry.file || entry.isExisting || uploadedRef.current) return;
		uploadedRef.current = true;
		const fd = new FormData();
		fd.set("intent", "upload");
		fd.set("file", entry.file);
		fd.set("residentId", String(slot.residentId));
		fd.set("category", slot.category);
		fd.set("documentType", slot.documentType);
		fetcher.submit(fd, { method: "post", encType: "multipart/form-data" });
	}, []);

	function handleDelete() {
		const result = fetcher.data as ClientActionResult | undefined;
		const fileId =
			entry.fileId ??
			(result?.ok === true && "fileId" in result ? result.fileId : undefined);
		onRemove(entry.clientId);
		if (fileId) {
			const fd = new FormData();
			fd.set("intent", "delete");
			fd.set("fileId", fileId);
			fetcher.submit(fd, { method: "post" });
		}
	}

	function handleRetry() {
		if (!entry.file) return;
		const fd = new FormData();
		fd.set("intent", "upload");
		fd.set("file", entry.file);
		fd.set("residentId", String(slot.residentId));
		fd.set("category", slot.category);
		fd.set("documentType", slot.documentType);
		fetcher.submit(fd, { method: "post", encType: "multipart/form-data" });
	}

	const isUploading = !entry.isExisting && fetcher.state !== "idle";
	const result = fetcher.data as ClientActionResult | undefined;
	const isError = result !== undefined && !result.ok;
	const errorMessage = isError
		? (result as UploadFailure).errorMessage
		: undefined;

	if (isError) {
		return (
			<li className="rounded-xl bg-[#FDF0EE] border border-[#F0C4BC] px-3 py-2.5">
				<div className="flex items-start gap-2.5">
					<svg
						aria-hidden="true"
						className="text-[#C45A4A] flex-shrink-0 mt-0.5"
						width="14"
						height="14"
						viewBox="0 0 14 14"
						fill="none"
					>
						<circle
							cx="7"
							cy="7"
							r="6.5"
							fill="#C45A4A"
							fillOpacity="0.12"
							stroke="#C45A4A"
							strokeWidth="1.25"
						/>
						<path
							d="M7 4v3.5M7 9.5v.5"
							stroke="#C45A4A"
							strokeWidth="1.5"
							strokeLinecap="round"
						/>
					</svg>
					<div className="flex-1 min-w-0">
						<p
							className="text-xs font-medium text-[#9B3E31] truncate"
							style={{ fontFamily: "'DM Sans', sans-serif" }}
						>
							{entry.filename}
						</p>
						<p
							className="text-xs text-[#B05040] mt-0.5"
							style={{ fontFamily: "'DM Sans', sans-serif" }}
						>
							{errorMessage ?? "Upload failed."}
						</p>
					</div>
					<div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
						<button
							type="button"
							onClick={handleRetry}
							className="text-xs font-medium text-[#C45A4A] hover:text-[#9B3E31] transition-colors underline underline-offset-2"
							style={{ fontFamily: "'DM Sans', sans-serif" }}
						>
							Retry
						</button>
						<button
							type="button"
							aria-label="Dismiss"
							onClick={() => onRemove(entry.clientId)}
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
		<li className="flex items-center gap-2">
			{isUploading ? (
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
			) : (
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
				{entry.filename}
			</span>
			{!isUploading && (
				<button
					type="button"
					aria-label="Remove"
					onClick={handleDelete}
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
}

// ── Slot card ─────────────────────────────────────────────────────────────────

function SlotCard({
	slot,
	applicationId,
}: {
	slot: DocumentSlot;
	applicationId: number;
}) {
	const [entries, setEntries] = useState<SlotFileEntry[]>(() =>
		slot.existingFiles.map((f) => ({
			clientId: f.fileId,
			filename: f.filename,
			fileId: f.fileId,
			isExisting: true,
		})),
	);

	function handleFilesSelected(files: FileList) {
		setEntries((prev) => [
			...prev,
			...Array.from(files).map((file) => ({
				clientId: Math.random().toString(36).slice(2),
				filename: file.name,
				file,
				isExisting: false,
			})),
		]);
	}

	function removeEntry(clientId: string) {
		setEntries((prev) => prev.filter((e) => e.clientId !== clientId));
	}

	const hasEntries = entries.length > 0;

	return (
		<div className="bg-white rounded-2xl p-5 mb-3 shadow-[0_1px_4px_rgba(28,26,23,0.07)]">
			<div className={hasEntries ? "mb-3" : "mb-4"}>
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

			{hasEntries && (
				<ul className="mb-3 space-y-1.5">
					{entries.map((entry) => (
						<FileRow
							key={entry.clientId}
							entry={entry}
							applicationId={applicationId}
							slot={slot}
							onRemove={removeEntry}
						/>
					))}
				</ul>
			)}

			<label className="flex items-center gap-2 text-sm text-[#C4714A] cursor-pointer select-none w-fit">
				<input
					type="file"
					multiple
					accept={ACCEPT_ATTRIBUTE}
					className="sr-only"
					onChange={(e) => {
						if (e.target.files?.length) handleFilesSelected(e.target.files);
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
					{hasEntries ? "Add more" : "Add document"}
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
			<div className="max-w-lg mx-auto px-5 pt-0 pb-36">
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
			<div className="fixed bottom-0 left-0 right-0 z-20 bg-[#F5F0E8] border-t border-[#E8E1D9] shadow-[0_-4px_12px_rgba(28,26,23,0.06)]">
				<div className="pt-4 pb-10 px-5">
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
							Adding documents strengthens your application
						</p>
					</div>
				</div>
			</div>
		</>
	);
}
