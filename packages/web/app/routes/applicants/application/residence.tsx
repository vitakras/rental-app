import { useState } from "react";
import { data, redirect, useLoaderData, useSubmit } from "react-router";
import { Button } from "~/components/ui/button";
import { DatePicker } from "~/components/ui/date-picker";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { apiClient } from "~/lib/api";
import {
	loadEditableApplication,
	parseApplicationParam,
} from "./form-route";
import type { Route } from "./+types/residence";

export function meta() {
	return [{ title: "Residence — Rental Application" }];
}

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
	const id = parseApplicationParam(params.id);
	const application = await loadEditableApplication(id);

	const residents = application.residents
		.filter((resident) => resident.role !== "child")
		.map((resident) => ({
			id: resident.id,
			fullName: resident.fullName,
			residences: resident.residences,
		}));

	return {
		applicationId: id,
		residents,
		notes: application.notes ?? "",
	};
}

export async function clientAction({
	request,
	params,
}: Route.ClientActionArgs) {
	const id = parseApplicationParam(params.id);
	await loadEditableApplication(id);

	const formData = await request.formData();
	const raw = JSON.parse(formData.get("data") as string) as {
		residents: Array<{
			residentId: number;
			residences: Array<{
				address: string;
				fromDate: string;
				toDate?: string;
				reasonForLeaving?: string;
				isRental: boolean;
				landlordName?: string;
				landlordPhone?: string;
			}>;
		}>;
		notes?: string;
	};

	const response = await apiClient.applications[":id"].residence.$put({
		param: { id: String(id) },
		json: raw,
	});

	if (response.status === 404) throw data(null, { status: 404 });
	if (response.status === 409) return redirect(`/a/applications/${id}`);
	if (response.status === 422) return await response.json();
	if (!response.ok) throw data(null, { status: response.status });

	return redirect(`/a/applications/${id}/documents`);
}

type ResidenceEntry = {
	id: string;
	address: string;
	fromDate: string;
	toDate: string;
	reasonForLeaving: string;
	isRental: boolean;
	landlordName: string;
	landlordPhone: string;
};

function emptyResidence(): ResidenceEntry {
	return {
		id: Math.random().toString(36).slice(2),
		address: "",
		fromDate: "",
		toDate: "",
		reasonForLeaving: "",
		isRental: false,
		landlordName: "",
		landlordPhone: "",
	};
}

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

function ResidentResidenceSection({
	residentName,
	residences,
	onAdd,
	onUpdate,
	onRemove,
}: {
	residentName: string;
	residences: ResidenceEntry[];
	onAdd: () => void;
	onUpdate: (
		id: string,
		field: keyof ResidenceEntry,
		value: string | boolean,
	) => void;
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

			{residences.map((residence, index) => (
				<div
					key={residence.id}
					className="bg-white rounded-2xl p-5 mb-3 shadow-[0_1px_4px_rgba(28,26,23,0.07)]"
				>
					<div className="flex items-center justify-between mb-4">
						<p className="text-sm font-medium text-[#1C1A17]">
							Address {index + 1}
						</p>
						<RemoveButton onClick={() => onRemove(residence.id)} />
					</div>

					<div className="mb-4">
						<TextInput
							label="Address"
							type="text"
							placeholder="123 Main St, City, State ZIP"
							value={residence.address}
							onChange={(e) =>
								onUpdate(residence.id, "address", e.target.value)
							}
						/>
					</div>

					<div className="grid grid-cols-2 gap-3 mb-4">
						<DatePicker
							label="From date"
							value={residence.fromDate}
							onChange={(value) => onUpdate(residence.id, "fromDate", value)}
						/>
						<DatePicker
							label="To date (optional)"
							value={residence.toDate}
							onChange={(value) => onUpdate(residence.id, "toDate", value)}
							placeholder="Present"
						/>
					</div>

					<div className="mb-4">
						<Label className="mb-1.5 block">
							Reason for leaving (optional)
						</Label>
						<Textarea
							rows={2}
							placeholder="Share any context you'd like"
							value={residence.reasonForLeaving}
							onChange={(e) =>
								onUpdate(residence.id, "reasonForLeaving", e.target.value)
							}
						/>
					</div>

					<div className="mb-4">
						<Label className="mb-1.5 block">Was this a rental?</Label>
						<div className="flex flex-wrap gap-2">
							{[
								{ label: "Rental", value: true },
								{ label: "Not a rental", value: false },
							].map((option) => (
								<button
									key={option.label}
									type="button"
									onClick={() =>
										onUpdate(residence.id, "isRental", option.value)
									}
									className={`px-3.5 py-2 rounded-xl border-2 text-sm transition-all ${
										residence.isRental === option.value
											? "border-[#C4714A] bg-[#FDF0E9] text-[#C4714A] font-medium"
											: "border-[#E8E1D9] bg-white text-[#7A7268]"
									}`}
									style={{ fontFamily: "'DM Sans', sans-serif" }}
								>
									{option.label}
								</button>
							))}
						</div>
					</div>

					{residence.isRental && (
						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
							<TextInput
								label="Landlord name (optional)"
								type="text"
								placeholder="Jordan Smith"
								value={residence.landlordName}
								onChange={(e) =>
									onUpdate(residence.id, "landlordName", e.target.value)
								}
							/>
							<TextInput
								label="Landlord phone (optional)"
								type="tel"
								placeholder="(555) 123-4567"
								value={residence.landlordPhone}
								onChange={(e) =>
									onUpdate(residence.id, "landlordPhone", e.target.value)
								}
							/>
						</div>
					)}
				</div>
			))}

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
				{residences.length === 0 ? "Add address" : "Add another address"}
			</button>
		</div>
	);
}

export default function ApplicationResidence() {
	const { residents, notes: initialNotes } =
		useLoaderData<typeof clientLoader>();
	const submit = useSubmit();

	const [residentResidences, setResidentResidences] = useState<
		{ residentId: number; fullName: string; residences: ResidenceEntry[] }[]
	>(() =>
		residents.map((resident) => ({
			residentId: resident.id,
			fullName: resident.fullName,
			residences: resident.residences.map((residence) => ({
				id: Math.random().toString(36).slice(2),
				address: residence.address,
				fromDate: residence.fromDate,
				toDate: residence.toDate ?? "",
				reasonForLeaving: residence.reasonForLeaving ?? "",
				isRental: residence.isRental,
				landlordName: residence.landlordName ?? "",
				landlordPhone: residence.landlordPhone ?? "",
			})),
		})),
	);
	const [notes, setNotes] = useState(initialNotes);

	function addResidence(residentIndex: number) {
		setResidentResidences((prev) =>
			prev.map((resident, index) =>
				index === residentIndex
					? {
							...resident,
							residences: [...resident.residences, emptyResidence()],
						}
					: resident,
			),
		);
	}

	function updateResidence(
		residentIndex: number,
		id: string,
		field: keyof ResidenceEntry,
		value: string | boolean,
	) {
		setResidentResidences((prev) =>
			prev.map((resident, index) =>
				index === residentIndex
					? {
							...resident,
							residences: resident.residences.map((entry) =>
								entry.id === id
									? {
											...entry,
											[field]: value,
											...(field === "isRental" && value === false
												? {
														landlordName: "",
														landlordPhone: "",
													}
												: {}),
										}
									: entry,
							),
						}
					: resident,
			),
		);
	}

	function removeResidence(residentIndex: number, id: string) {
		setResidentResidences((prev) =>
			prev.map((resident, index) =>
				index === residentIndex
					? {
							...resident,
							residences: resident.residences.filter(
								(entry) => entry.id !== id,
							),
						}
					: resident,
			),
		);
	}

	function handleContinue() {
		const payload = {
			residents: residentResidences.map(({ residentId, residences }) => ({
				residentId,
				residences: residences
					.filter(
						(residence) =>
							residence.address ||
							residence.fromDate ||
							residence.toDate ||
							residence.reasonForLeaving ||
							residence.landlordName ||
							residence.landlordPhone,
					)
					.map((residence) => ({
						address: residence.address,
						fromDate: residence.fromDate,
						toDate: residence.toDate || undefined,
						reasonForLeaving: residence.reasonForLeaving || undefined,
						isRental: residence.isRental,
						landlordName: residence.isRental
							? residence.landlordName || undefined
							: undefined,
						landlordPhone: residence.isRental
							? residence.landlordPhone || undefined
							: undefined,
					})),
			})),
			notes: notes || undefined,
		};

		submit({ data: JSON.stringify(payload) }, { method: "post" });
	}

	return (
		<>
			<div className="max-w-lg mx-auto px-5 pt-24 pb-36">
				<div className="mt-8 mb-8">
					<h1
						className="text-[1.55rem] leading-[1.25] text-[#1C1A17] mb-3"
						style={{ fontFamily: "'Fraunces', serif", fontWeight: 300 }}
					>
						Tell us about <em>your rental history.</em>
					</h1>
					<p
						className="text-[#7A7268] text-sm leading-relaxed"
						style={{ fontFamily: "'DM Sans', sans-serif" }}
					>
						Add addresses for the past 2 years for each applicant. You can skip
						this step if you prefer.
					</p>
				</div>

				{residentResidences.map((resident, index) => (
					<div key={resident.residentId}>
						{residentResidences.length > 1 && (
							<SectionLabel>{resident.fullName}</SectionLabel>
						)}
						<ResidentResidenceSection
							residentName={resident.fullName}
							residences={resident.residences}
							onAdd={() => addResidence(index)}
							onUpdate={(id, field, value) =>
								updateResidence(index, id, field, value)
							}
							onRemove={(id) => removeResidence(index, id)}
						/>
					</div>
				))}

				<div className="bg-white rounded-2xl p-5 shadow-[0_1px_4px_rgba(28,26,23,0.07)]">
					<SectionLabel>Notes</SectionLabel>
					<Textarea
						rows={4}
						placeholder="Anything else you'd like us to know?"
						value={notes}
						onChange={(e) => setNotes(e.target.value)}
					/>
				</div>
			</div>

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
							You can skip this step and add residence details later
						</p>
					</div>
				</div>
			</div>
		</>
	);
}
