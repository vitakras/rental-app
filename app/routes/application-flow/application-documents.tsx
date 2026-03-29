import { useState } from "react";
import { data, useLoaderData, useNavigate } from "react-router";
import type { Route } from "./+types/application-documents";
import { Button } from "~/components/ui/button";
import type { ApplicationDocumentCategory, ApplicationDocumentType } from "~/db/schema";
import { repositories, services } from "~/server/container";

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

export async function loader({ params }: Route.LoaderArgs) {
	const id = Number(params.id);
	const app = await repositories.applicationRepository.findByIdWithDetails(id);
	if (!app) throw data(null, { status: 404 });

	const adults = app.residents.filter((r) => r.role !== "child");

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

// ── Action ────────────────────────────────────────────────────────────────────

export async function action({ request, params }: Route.ActionArgs) {
	const id = Number(params.id);
	const formData = await request.formData();
	const intent = formData.get("intent") as string;

	if (intent === "prepare") {
		const filename = formData.get("filename") as string;
		const contentType = formData.get("contentType") as string;
		const sizeBytes = Number(formData.get("sizeBytes"));

		const result = await services.fileService.prepareDocumentUpload({
			originalFilename: filename,
			contentType: contentType || "application/octet-stream",
			sizeBytes,
			uploadedByUserId: `app-${id}`,
		});

		if (!result.success) return data({ error: "prepare_failed" }, { status: 422 });
		return data({ fileId: result.fileId, uploadUrl: result.uploadUrl });
	}

	if (intent === "complete") {
		const fileId = formData.get("fileId") as string;
		const residentId = Number(formData.get("residentId"));
		const category = formData.get("category") as ApplicationDocumentCategory;
		const documentType = formData.get("documentType") as ApplicationDocumentType;

		const completeResult = await services.fileService.completeUpload(fileId);
		if (!completeResult.success) return data({ error: "complete_failed" }, { status: 422 });

		await repositories.applicationDocumentRepository.create({
			applicationId: id,
			residentId,
			fileId,
			category,
			documentType,
		});
		await repositories.fileRepository.markAttached(fileId);

		return data({ success: true });
	}

	return data({ error: "unknown_intent" }, { status: 400 });
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

// ── Upload state ──────────────────────────────────────────────────────────────

interface UploadedFile {
	clientId: string;
	filename: string;
	status: "uploading" | "done" | "error";
	fileId?: string;
}

// ── Slot card ─────────────────────────────────────────────────────────────────

function SlotCard({
	slot,
	uploadedFiles,
	onFiles,
}: {
	slot: DocumentSlot;
	uploadedFiles: UploadedFile[];
	onFiles: (files: FileList) => void;
}) {
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
						<li
							key={file.clientId}
							className="flex items-center gap-2"
						>
							{file.status === "uploading" && (
								<svg
									aria-hidden="true"
									className="animate-spin text-[#C4714A] flex-shrink-0"
									width="14"
									height="14"
									viewBox="0 0 14 14"
									fill="none"
								>
									<circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="22" strokeDashoffset="8" strokeLinecap="round" />
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
								{file.status === "error" ? `${file.filename} — upload failed` : file.filename}
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
						if (e.target.files?.length) onFiles(e.target.files);
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
	const { applicationId, residents } = useLoaderData<typeof loader>();
	const navigate = useNavigate();

	const [uploads, setUploads] = useState<Record<string, UploadedFile[]>>({});

	async function handleFiles(slotKey: string, files: FileList, slot: DocumentSlot) {
		for (const file of Array.from(files)) {
			const clientId = Math.random().toString(36).slice(2);

			setUploads((prev) => ({
				...prev,
				[slotKey]: [
					...(prev[slotKey] ?? []),
					{ clientId, filename: file.name, status: "uploading" },
				],
			}));

			try {
				// 1. Prepare — get presigned upload URL
				const prepareForm = new FormData();
				prepareForm.set("intent", "prepare");
				prepareForm.set("filename", file.name);
				prepareForm.set("contentType", file.type || "application/octet-stream");
				prepareForm.set("sizeBytes", String(file.size));

				const prepareRes = await fetch(`/applications/${applicationId}/documents`, {
					method: "POST",
					body: prepareForm,
				});
				if (!prepareRes.ok) throw new Error("Failed to prepare upload");
				const { fileId, uploadUrl } = await prepareRes.json();

				// 2. Upload directly to blob storage
				const uploadRes = await fetch(uploadUrl, {
					method: "PUT",
					body: file,
					headers: { "Content-Type": file.type || "application/octet-stream" },
				});
				if (!uploadRes.ok) throw new Error("Failed to upload file");

				// 3. Complete — mark uploaded + create applicationDocument
				const completeForm = new FormData();
				completeForm.set("intent", "complete");
				completeForm.set("fileId", fileId);
				completeForm.set("residentId", String(slot.residentId));
				completeForm.set("category", slot.category);
				completeForm.set("documentType", slot.documentType);

				const completeRes = await fetch(`/applications/${applicationId}/documents`, {
					method: "POST",
					body: completeForm,
				});
				if (!completeRes.ok) throw new Error("Failed to complete upload");

				setUploads((prev) => ({
					...prev,
					[slotKey]: (prev[slotKey] ?? []).map((f) =>
						f.clientId === clientId ? { ...f, status: "done", fileId } : f,
					),
				}));
			} catch {
				setUploads((prev) => ({
					...prev,
					[slotKey]: (prev[slotKey] ?? []).map((f) =>
						f.clientId === clientId ? { ...f, status: "error" } : f,
					),
				}));
			}
		}
	}

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
								uploadedFiles={uploads[slot.key] ?? []}
								onFiles={(files) => handleFiles(slot.key, files, slot)}
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
