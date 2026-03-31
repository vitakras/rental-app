import type { ApplicationWithDetails } from "api";
import { useState } from "react";
import { data, redirect, useLoaderData, useSubmit } from "react-router";
import { Button } from "~/components/ui/button";
import { DatePicker } from "~/components/ui/date-picker";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { apiClient } from "~/lib/api";
import type { Route } from "./+types/application-income";

export function meta() {
	return [{ title: "Income — Rental Application" }];
}

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

	// Only adult residents have income (not children)
	const residents = application.residents.filter((r) => r.role !== "child");

	return { applicationId: id, residents };
}

export async function clientAction({
	request,
	params,
}: Route.ClientActionArgs) {
	const id = Number(params.id);
	if (!Number.isInteger(id) || id <= 0) throw data(null, { status: 404 });

	const formData = await request.formData();
	const raw = JSON.parse(formData.get("data") as string) as Array<{
		residentId: number;
		incomeSources: Array<{
			type: "employment" | "self_employment" | "other";
			employerOrSourceName: string;
			titleOrOccupation?: string;
			monthlyAmountCents: number;
			startDate: string;
			endDate?: string;
			notes?: string;
		}>;
	}>;
	const response = await apiClient.applications[":id"].income.$put({
		param: { id: String(id) },
		json: raw,
	});

	if (response.status === 404) {
		throw data(null, { status: 404 });
	}
	if (response.status === 422) {
		return await response.json();
	}
	if (!response.ok) {
		throw data(null, { status: response.status });
	}

	return redirect(`/a/applications/${id}/documents`);
}

// ── Types ─────────────────────────────────────────────────────────────────────

type IncomeType = "employment" | "self_employment" | "other" | "";

interface IncomeSourceEntry {
	id: string;
	type: IncomeType;
	employerOrSourceName: string;
	titleOrOccupation: string;
	monthlyAmount: string;
	startDate: string;
	endDate: string;
	notes: string;
}

const INCOME_TYPE_OPTIONS: { value: IncomeType; label: string }[] = [
	{ value: "employment", label: "Employment" },
	{ value: "self_employment", label: "Self-employed" },
	{ value: "other", label: "Other" },
];

function emptyIncomeSource(): IncomeSourceEntry {
	return {
		id: Math.random().toString(36).slice(2),
		type: "",
		employerOrSourceName: "",
		titleOrOccupation: "",
		monthlyAmount: "",
		startDate: "",
		endDate: "",
		notes: "",
	};
}

function incomeSourceLabels(type: IncomeType) {
	if (type === "employment")
		return { employer: "Employer name", title: "Job title" };
	if (type === "self_employment")
		return { employer: "Business name", title: "Occupation" };
	return { employer: "Source name", title: "Description" };
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

function TextInput({
	label,
	...props
}: React.ComponentProps<typeof Input> & { label: string }) {
	const id = label.toLowerCase().replace(/\s+/g, "-");
	return (
		<div>
			<Label htmlFor={id} className="mb-1.5 block">
				{label}
			</Label>
			<Input id={id} {...props} />
		</div>
	);
}

function RemoveButton({ onClick }: { onClick: () => void }) {
	return (
		<Button
			type="button"
			variant="ghost"
			size="icon-sm"
			onClick={onClick}
			aria-label="Remove"
			className="rounded-full bg-[#F5F0E8] hover:bg-[#EDE8E0] text-[#7A7268] flex-shrink-0"
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
		</Button>
	);
}

// ── Resident income section ───────────────────────────────────────────────────

function ResidentIncomeSection({
	residentName,
	sources,
	onAdd,
	onUpdate,
	onRemove,
}: {
	residentName: string;
	sources: IncomeSourceEntry[];
	onAdd: () => void;
	onUpdate: (id: string, field: keyof IncomeSourceEntry, value: string) => void;
	onRemove: (id: string) => void;
}) {
	return (
		<div className="mb-4">
			<p
				className="text-sm font-medium text-[#1C1A17] px-1 mb-2"
				style={{ fontFamily: "'DM Sans', sans-serif" }}
			>
				{residentName}
			</p>

			{sources.map((source, i) => {
				const labels = incomeSourceLabels(source.type);
				return (
					<div
						key={source.id}
						className="bg-white rounded-2xl p-5 mb-3 shadow-[0_1px_4px_rgba(28,26,23,0.07)]"
					>
						<div className="flex items-center justify-between mb-4">
							<p className="text-sm font-medium text-[#1C1A17]">
								Income source {i + 1}
							</p>
							<RemoveButton onClick={() => onRemove(source.id)} />
						</div>

						{/* Type */}
						<div className="mb-4">
							<Label className="mb-1.5 block">Type</Label>
							<div className="flex flex-wrap gap-2">
								{INCOME_TYPE_OPTIONS.map(({ value, label }) => (
									<button
										key={value}
										type="button"
										onClick={() => onUpdate(source.id, "type", value)}
										className={`px-3.5 py-2 rounded-xl border-2 text-sm transition-all ${
											source.type === value
												? "border-[#C4714A] bg-[#FDF0E9] text-[#C4714A] font-medium"
												: "border-[#E8E1D9] bg-white text-[#7A7268]"
										}`}
										style={{ fontFamily: "'DM Sans', sans-serif" }}
									>
										{label}
									</button>
								))}
							</div>
						</div>

						{/* Employer / Source name */}
						<div className="mb-4">
							<TextInput
								label={labels.employer}
								type="text"
								placeholder={
									source.type === "employment"
										? "Acme Corp"
										: source.type === "self_employment"
											? "My Business LLC"
											: "e.g. Rental income"
								}
								value={source.employerOrSourceName}
								onChange={(e) =>
									onUpdate(source.id, "employerOrSourceName", e.target.value)
								}
							/>
						</div>

						{/* Title / Occupation */}
						<div className="mb-4">
							<TextInput
								label={`${labels.title} (optional)`}
								type="text"
								placeholder={
									source.type === "employment"
										? "Software Engineer"
										: source.type === "self_employment"
											? "Consultant"
											: "Optional description"
								}
								value={source.titleOrOccupation}
								onChange={(e) =>
									onUpdate(source.id, "titleOrOccupation", e.target.value)
								}
							/>
						</div>

						{/* Monthly income */}
						<div className="mb-4">
							<Label className="mb-1.5 block">Monthly income</Label>
							<div className="relative">
								<span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-[#7A7268] pointer-events-none">
									$
								</span>
								<Input
									type="number"
									min="0"
									step="1"
									className="pl-7"
									placeholder="0"
									value={source.monthlyAmount}
									onChange={(e) =>
										onUpdate(source.id, "monthlyAmount", e.target.value)
									}
								/>
							</div>
						</div>

						{/* Dates */}
						<div className="grid grid-cols-2 gap-3 mb-4">
							<DatePicker
								label="Start date"
								value={source.startDate}
								onChange={(value) => onUpdate(source.id, "startDate", value)}
							/>
							<DatePicker
								label="End date (optional)"
								value={source.endDate}
								onChange={(value) => onUpdate(source.id, "endDate", value)}
								placeholder="No end date"
							/>
						</div>

						{/* Notes */}
						<div>
							<Label className="mb-1.5 block">Notes (optional)</Label>
							<Textarea
								rows={2}
								placeholder="Any additional details..."
								value={source.notes}
								onChange={(e) => onUpdate(source.id, "notes", e.target.value)}
							/>
						</div>
					</div>
				);
			})}

			<button
				type="button"
				onClick={onAdd}
				className="w-full py-3.5 rounded-2xl border-2 border-dashed border-[#C4714A] text-[#C4714A] text-sm font-medium flex items-center justify-center gap-2 transition-all active:bg-[#FDF0E9] bg-white/50"
				style={{ fontFamily: "'DM Sans', sans-serif" }}
			>
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
				{sources.length === 0 ? "Add income source" : "Add another source"}
			</button>
		</div>
	);
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ApplicationIncome() {
	const { applicationId, residents } = useLoaderData<typeof clientLoader>();
	const submit = useSubmit();

	const [residentSources, setResidentSources] = useState<
		{ residentId: number; fullName: string; sources: IncomeSourceEntry[] }[]
	>(() =>
		residents.map((r) => ({
			residentId: r.id,
			fullName: r.fullName,
			sources: [],
		})),
	);

	function addSource(residentIndex: number) {
		setResidentSources((prev) =>
			prev.map((r, i) =>
				i === residentIndex
					? { ...r, sources: [...r.sources, emptyIncomeSource()] }
					: r,
			),
		);
	}

	function updateSource(
		residentIndex: number,
		id: string,
		field: keyof IncomeSourceEntry,
		value: string,
	) {
		setResidentSources((prev) =>
			prev.map((r, i) =>
				i === residentIndex
					? {
							...r,
							sources: r.sources.map((s) =>
								s.id === id ? { ...s, [field]: value } : s,
							),
						}
					: r,
			),
		);
	}

	function removeSource(residentIndex: number, id: string) {
		setResidentSources((prev) =>
			prev.map((r, i) =>
				i === residentIndex
					? { ...r, sources: r.sources.filter((s) => s.id !== id) }
					: r,
			),
		);
	}

	function handleContinue() {
		const payload = residentSources.map(({ residentId, sources }) => ({
			residentId,
			incomeSources: sources
				.filter((s) => s.type !== "")
				.map((s) => ({
					type: s.type as "employment" | "self_employment" | "other",
					employerOrSourceName: s.employerOrSourceName,
					titleOrOccupation: s.titleOrOccupation || undefined,
					monthlyAmountCents: Math.round(
						parseFloat(s.monthlyAmount || "0") * 100,
					),
					startDate: s.startDate,
					endDate: s.endDate || undefined,
					notes: s.notes || undefined,
				})),
		}));

		submit({ data: JSON.stringify(payload) }, { method: "post" });
	}

	return (
		<div
			className="min-h-screen bg-[#F5F0E8]"
			style={{ fontFamily: "'DM Sans', sans-serif" }}
		>
			{/* ── Fixed top bar ── */}
			<div className="fixed top-0 left-0 right-0 z-30">
				<div className="h-[3px] bg-[#E8E1D9]">
					<div
						className="h-full bg-[#C4714A] transition-all duration-700"
						style={{ width: "75%" }}
					/>
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
							Step 3 of 4
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
						Tell us about
						<br />
						<em>your income.</em>
					</h1>
					<p
						className="text-[#7A7268] text-sm leading-relaxed"
						style={{ fontFamily: "'DM Sans', sans-serif" }}
					>
						List all sources of income for each adult applicant. You can skip
						this step if you'd prefer to provide documentation later.
					</p>
				</div>

				{/* ── Per-resident income sections ── */}
				{residentSources.map((resident, i) => (
					<div key={resident.residentId}>
						{residentSources.length > 1 && (
							<SectionLabel>{resident.fullName}</SectionLabel>
						)}
						<ResidentIncomeSection
							residentName={resident.fullName}
							sources={resident.sources}
							onAdd={() => addSource(i)}
							onUpdate={(id, field, value) => updateSource(i, id, field, value)}
							onRemove={(id) => removeSource(i, id)}
						/>
					</div>
				))}
			</div>

			{/* ── Fixed footer CTA ── */}
			<div className="fixed bottom-0 left-0 right-0 pointer-events-none z-20">
				<div className="bg-gradient-to-t from-[#F5F0E8] via-[#F5F0E8]/95 to-transparent pt-8 pb-10 px-5 pointer-events-auto">
					<div className="max-w-lg mx-auto">
						<Button variant="continue" type="button" onClick={handleContinue}>
							Continue
						</Button>
						<p
							className="text-center text-xs text-[#7A7268] mt-3"
							style={{ fontFamily: "'DM Sans', sans-serif" }}
						>
							You can skip this step and add income details later
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}
