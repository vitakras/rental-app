import type { ApplicationWithDetails } from "api";
import { useState } from "react";
import { data, redirect, useNavigate, useSubmit } from "react-router";
import { Button } from "~/components/ui/button";
import { DatePicker } from "~/components/ui/date-picker";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { apiClient } from "~/lib/api";
import type { Route } from "./+types/application-occupants";

export function meta() {
	return [{ title: "Occupants — Rental Application" }];
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

	const additionalAdults = application.residents
		.filter(
			(resident) =>
				resident.role === "co-applicant" || resident.role === "dependent",
		)
		.map((resident) => ({
			id: Math.random().toString(36).slice(2),
			existingId: resident.id,
			name: resident.fullName,
			role: resident.role as AdultRole,
			email: resident.email ?? "",
			dob: resident.dateOfBirth,
		}));

	const children = application.residents
		.filter((resident) => resident.role === "child")
		.map((resident) => ({
			id: Math.random().toString(36).slice(2),
			existingId: resident.id,
			name: resident.fullName,
			dob: resident.dateOfBirth,
		}));

	const pets = application.pets.map((pet) => ({
		id: Math.random().toString(36).slice(2),
		type: pet.type,
		name: pet.name ?? "",
		breed: pet.breed ?? "",
		notes: pet.notes ?? "",
	}));

	return {
		applicationId: id,
		smokes: application.smokes as boolean | null,
		additionalAdults,
		children,
		pets,
		hasPets: pets.length > 0 ? true : null,
	};
}

export async function clientAction({
	request,
	params,
}: Route.ClientActionArgs) {
	const id = Number(params.id);
	if (!Number.isInteger(id) || id <= 0) throw data(null, { status: 404 });
	const formData = await request.formData();
	const intent = formData.get("intent");

	if (intent === "remove_resident") {
		const residentId = formData.get("residentId");
		const response = await apiClient.applications[":id"].residents[
			":residentId"
		].$delete({
			param: { id: String(id), residentId: String(residentId) },
		});

		if (!response.ok) throw data(null, { status: response.status });
		return { removed: true };
	}

	const raw = JSON.parse(formData.get("data") as string);
	const response = await apiClient.applications[":id"].occupants.$put({
		param: { id: String(id) },
		json: raw,
	});

	if (response.status === 422) {
		const result = await response.json();
		return { errors: result.issues };
	}
	if (!response.ok) throw data(null, { status: response.status });

	return redirect(`/a/applications/${id}/income`);
}

// ── Types ─────────────────────────────────────────────────────────────────────

type AdultRole = "co-applicant" | "dependent";

interface AdditionalAdult {
	id: string;
	existingId?: number;
	name: string;
	role: AdultRole | null;
	email: string;
	dob: string;
}

interface Child {
	id: string;
	existingId?: number;
	name: string;
	dob: string;
}

interface Pet {
	id: string;
	type: string;
	breed: string;
	name: string;
	notes: string;
}

const PET_TYPES = [
	"Dog",
	"Cat",
	"Bird",
	"Reptile",
	"Fish",
	"Small animal",
	"Other",
];

function emptyPet(): Pet {
	return {
		id: Math.random().toString(36).slice(2),
		type: "",
		breed: "",
		name: "",
		notes: "",
	};
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
	hint,
	...props
}: React.ComponentProps<typeof Input> & {
	label: string;
	hint?: string;
}) {
	const id = label.toLowerCase().replace(/\s+/g, "-");
	return (
		<div>
			<Label htmlFor={id} className="mb-1.5 block">
				{label}
			</Label>
			<Input id={id} {...props} />
			{hint && (
				<p className="text-xs text-[#7A7268] mt-1.5 leading-relaxed">{hint}</p>
			)}
		</div>
	);
}

function YesNoToggle({
	value,
	onChange,
}: {
	value: boolean | null;
	onChange: (v: boolean) => void;
}) {
	return (
		<div className="flex gap-3">
			{([true, false] as const).map((v) => (
				<button
					key={String(v)}
					type="button"
					onClick={() => onChange(v)}
					className={`flex-1 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
						value === v
							? "border-[#C4714A] bg-[#C4714A] text-white"
							: "border-[#E8E1D9] bg-white text-[#7A7268] active:bg-[#F5F0E8]"
					}`}
					style={{ fontFamily: "'DM Sans', sans-serif" }}
				>
					{v ? "Yes" : "No"}
				</button>
			))}
		</div>
	);
}

// ── Stepper ───────────────────────────────────────────────────────────────────

function Stepper({
	value,
	onChange,
	min = 0,
	max = 10,
}: {
	value: number;
	onChange: (v: number) => void;
	min?: number;
	max?: number;
}) {
	return (
		<div className="flex items-center gap-5">
			<Button
				type="button"
				variant="outline"
				size="stepper"
				onClick={() => onChange(Math.max(min, value - 1))}
				disabled={value <= min}
				aria-label="Decrease"
				className="border-2 border-[#C4714A] text-[#C4714A] hover:bg-transparent active:scale-90 disabled:opacity-25"
			>
				−
			</Button>
			<span
				className="w-8 text-center text-3xl text-[#1C1A17] select-none tabular-nums"
				style={{ fontFamily: "'Fraunces', serif", fontWeight: 300 }}
			>
				{value}
			</span>
			<Button
				type="button"
				size="stepper"
				onClick={() => onChange(Math.min(max, value + 1))}
				disabled={value >= max}
				aria-label="Increase"
				className="bg-[#C4714A] text-white hover:bg-[#B5663F] border-0 active:scale-90 disabled:opacity-25"
			>
				+
			</Button>
		</div>
	);
}

// ── Role selector ─────────────────────────────────────────────────────────────

const ROLES: { role: AdultRole; label: string; desc: string }[] = [
	{
		role: "co-applicant",
		label: "Co-applicant",
		desc: "Shares financial responsibility — they'll receive an invite",
	},
	{
		role: "dependent",
		label: "Adult dependent",
		desc: "Lives here but is not on the lease",
	},
];

function RoleSelector({
	value,
	onChange,
}: {
	value: AdultRole | null;
	onChange: (v: AdultRole) => void;
}) {
	return (
		<div className="flex flex-col gap-2">
			{ROLES.map(({ role, label, desc }) => (
				<button
					key={role}
					type="button"
					onClick={() => onChange(role)}
					className={`flex items-start gap-3 p-3.5 rounded-xl border-2 text-left transition-all ${
						value === role
							? "border-[#C4714A] bg-[#FDF0E9]"
							: "border-[#E8E1D9] bg-white active:bg-[#F9F6F2]"
					}`}
				>
					<div
						className={`mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
							value === role ? "border-[#C4714A]" : "border-[#C0B8AF]"
						}`}
					>
						{value === role && (
							<div className="w-2 h-2 rounded-full bg-[#C4714A]" />
						)}
					</div>
					<div>
						<p
							className="text-sm font-medium text-[#1C1A17]"
							style={{ fontFamily: "'DM Sans', sans-serif" }}
						>
							{label}
						</p>
						<p
							className="text-xs text-[#7A7268] mt-0.5 leading-relaxed"
							style={{ fontFamily: "'DM Sans', sans-serif" }}
						>
							{desc}
						</p>
					</div>
				</button>
			))}
		</div>
	);
}

// ── Card remove button ────────────────────────────────────────────────────────

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

// ── Icons ─────────────────────────────────────────────────────────────────────

function PawIcon() {
	return (
		<svg
			aria-hidden="true"
			width="22"
			height="22"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.5"
			strokeLinecap="round"
			strokeLinejoin="round"
			className="text-[#C4714A]"
		>
			<path d="M11 20a2 2 0 0 0 2 0l5-3a2 2 0 0 0 1-1.73V13a2 2 0 0 0-1-1.73l-5-3a2 2 0 0 0-2 0l-5 3A2 2 0 0 0 5 13v2.27A2 2 0 0 0 6 17z" />
			<circle cx="7.5" cy="5.5" r="1.5" />
			<circle cx="16.5" cy="5.5" r="1.5" />
			<circle cx="20.5" cy="10.5" r="1.5" />
			<circle cx="3.5" cy="10.5" r="1.5" />
		</svg>
	);
}

function NoSmokingIcon() {
	return (
		<svg
			aria-hidden="true"
			width="22"
			height="22"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.5"
			strokeLinecap="round"
			strokeLinejoin="round"
			className="text-[#C4714A]"
		>
			<line x1="2" y1="2" x2="22" y2="22" />
			<path d="M16 9h2a2 2 0 0 1 2 2v1" />
			<path d="M4 14h12v4H4z" />
			<path d="M12 14v4" />
			<path d="M19 14h1v4h-1" />
		</svg>
	);
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ApplicationOccupants({
	loaderData,
}: Route.ComponentProps) {
	const submit = useSubmit();
	const navigate = useNavigate();

	// Occupants
	const [adults, setAdults] = useState(1 + loaderData.additionalAdults.length);
	const [additionalAdults, setAdditionalAdults] = useState<AdditionalAdult[]>(
		loaderData.additionalAdults,
	);
	const [children, setChildren] = useState(loaderData.children.length);
	const [childList, setChildList] = useState<Child[]>(loaderData.children);

	// Lifestyle
	const [hasPets, setHasPets] = useState<boolean | null>(loaderData.hasPets);
	const [pets, setPets] = useState<Pet[]>(loaderData.pets);
	const [smokes, setSmokes] = useState<boolean | null>(loaderData.smokes);
	const [confirmingRemove, setConfirmingRemove] = useState<string | null>(null);

	// ── Handlers ──

	function handleAdultsChange(newCount: number) {
		const additional = Math.max(0, newCount - 1);
		const current = additionalAdults.length;
		if (additional > current) {
			setAdditionalAdults((prev) => [
				...prev,
				...Array.from({ length: additional - current }, () => ({
					id: Math.random().toString(36).slice(2),
					name: "",
					role: null,
					email: "",
					dob: "",
				})),
			]);
		} else {
			setAdditionalAdults((prev) => prev.slice(0, additional));
		}
		setAdults(newCount);
	}

	function updateAdult(
		index: number,
		field: keyof AdditionalAdult,
		value: string | AdultRole,
	) {
		setAdditionalAdults((prev) =>
			prev.map((a, i) => (i === index ? { ...a, [field]: value } : a)),
		);
	}

	function handleChildrenChange(newCount: number) {
		const current = childList.length;
		if (newCount > current) {
			setChildList((prev) => [
				...prev,
				...Array.from({ length: newCount - current }, () => ({
					id: Math.random().toString(36).slice(2),
					name: "",
					dob: "",
				})),
			]);
		} else {
			setChildList((prev) => prev.slice(0, newCount));
		}
		setChildren(newCount);
	}

	function updateChild(index: number, field: keyof Child, value: string) {
		setChildList((prev) =>
			prev.map((c, i) => (i === index ? { ...c, [field]: value } : c)),
		);
	}

	function addPet() {
		setPets((prev) => [...prev, emptyPet()]);
	}

	function updatePet<K extends keyof Pet>(id: string, field: K, value: Pet[K]) {
		setPets((prev) =>
			prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)),
		);
	}

	function removePet(id: string) {
		setPets((prev) => prev.filter((p) => p.id !== id));
		if (pets.length === 1) setHasPets(null);
	}

	function removeAdult(adult: AdditionalAdult) {
		setAdditionalAdults((prev) =>
			prev.filter((entry) => entry.id !== adult.id),
		);
		setAdults((prev) => prev - 1);
		setConfirmingRemove(null);

		if (adult.existingId) {
			const formData = new FormData();
			formData.set("intent", "remove_resident");
			formData.set("residentId", String(adult.existingId));
			submit(formData, { method: "post" });
		}
	}

	function removeChild(child: Child) {
		setChildList((prev) => prev.filter((entry) => entry.id !== child.id));
		setChildren((prev) => prev - 1);
		setConfirmingRemove(null);

		if (child.existingId) {
			const formData = new FormData();
			formData.set("intent", "remove_resident");
			formData.set("residentId", String(child.existingId));
			submit(formData, { method: "post" });
		}
	}

	const totalPeople = adults + children;
	const occupantSummary =
		totalPeople === 1
			? "Just you"
			: `${adults} adult${adults !== 1 ? "s" : ""}${
					children > 0
						? `, ${children} child${children !== 1 ? "ren" : ""}`
						: ""
				}`;

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
						style={{ width: "50%" }}
					/>
				</div>
				<div className="bg-[#F5F0E8]/90 backdrop-blur-sm">
					<div className="max-w-lg mx-auto px-5 py-3 flex items-center justify-between">
						<Button
							type="button"
							variant="ghost-muted"
							size="sm"
							className="gap-1 py-1"
							onClick={() =>
								navigate(
									`/a/applications/${loaderData.applicationId}/applicant`,
								)
							}
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
							Step 2 of 4
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
						Rental Application
					</p>
					<h1
						className="text-[2.6rem] leading-[1.15] text-[#1C1A17] mb-3"
						style={{ fontFamily: "'Fraunces', serif", fontWeight: 300 }}
					>
						Who else is
						<br />
						<em>moving in?</em>
					</h1>
					<p
						className="text-[#7A7268] text-sm leading-relaxed"
						style={{ fontFamily: "'DM Sans', sans-serif" }}
					>
						Tell us about the other occupants and any pets.
					</p>
				</div>

				{/* ── Occupants card ── */}
				<div className="bg-white rounded-2xl p-5 mb-4 shadow-[0_1px_4px_rgba(28,26,23,0.07)]">
					<SectionLabel>Occupants</SectionLabel>

					<div className="flex items-center justify-between py-4 border-b border-[#F0EBE3]">
						<div>
							<p className="text-sm font-medium text-[#1C1A17]">Adults</p>
							<p className="text-xs text-[#7A7268] mt-0.5">18 years or older</p>
						</div>
						<Stepper
							value={adults}
							onChange={handleAdultsChange}
							min={1}
							max={8}
						/>
					</div>

					<div className="flex items-center justify-between py-4">
						<div>
							<p className="text-sm font-medium text-[#1C1A17]">Children</p>
							<p className="text-xs text-[#7A7268] mt-0.5">Under 18</p>
						</div>
						<Stepper
							value={children}
							onChange={handleChildrenChange}
							min={0}
							max={8}
						/>
					</div>

					{totalPeople > 0 && (
						<div className="mt-2 pt-4 border-t border-[#F0EBE3] flex justify-center">
							<span className="inline-flex items-center gap-1.5 bg-[#F5E8DF] text-[#C4714A] text-xs font-medium px-3 py-1.5 rounded-full">
								<svg
									aria-hidden="true"
									width="12"
									height="12"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
								>
									<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
									<circle cx="9" cy="7" r="4" />
									<path d="M23 21v-2a4 4 0 0 0-3-3.87" />
									<path d="M16 3.13a4 4 0 0 1 0 7.75" />
								</svg>
								{occupantSummary}
							</span>
						</div>
					)}
				</div>

				{/* ── Additional adult cards ── */}
				{additionalAdults.length > 0 && (
					<div className="mb-4 space-y-3">
						{additionalAdults.map((adult, i) => (
							<div
								key={adult.id}
								className="bg-white rounded-2xl p-5 shadow-[0_1px_4px_rgba(28,26,23,0.07)]"
							>
								<div className="flex items-center gap-3 mb-5">
									<div className="w-9 h-9 rounded-full bg-[#F5E8DF] flex items-center justify-center flex-shrink-0">
										<span
											className="text-sm text-[#C4714A]"
											style={{
												fontFamily: "'Fraunces', serif",
												fontWeight: 400,
											}}
										>
											{i + 2}
										</span>
									</div>
									<div className="flex-1 min-w-0">
										<p className="text-sm font-medium text-[#1C1A17] truncate">
											{adult.name || `Adult ${i + 2}`}
										</p>
										{adult.role && (
											<p className="text-xs text-[#7A7268] mt-0.5 capitalize">
												{adult.role}
											</p>
										)}
									</div>
									<RemoveButton onClick={() => setConfirmingRemove(adult.id)} />
								</div>

								{confirmingRemove === adult.id ? (
									<div className="rounded-xl bg-[#FDF0E9] border-2 border-[#C4714A] p-4">
										<p className="text-sm font-medium text-[#1C1A17] mb-1">
											Remove {adult.name || "this person"}?
										</p>
										{adult.existingId ? (
											<p className="text-xs text-[#7A7268] mb-4 leading-relaxed">
												This will permanently delete their income sources and
												any other information they&apos;ve submitted. This
												cannot be undone.
											</p>
										) : (
											<p className="text-xs text-[#7A7268] mb-4 leading-relaxed">
												This person hasn&apos;t been saved yet, so removing them
												will only clear this card.
											</p>
										)}
										<div className="flex gap-2">
											<button
												type="button"
												onClick={() => setConfirmingRemove(null)}
												className="flex-1 py-2 rounded-xl border-2 border-[#E8E1D9] text-sm text-[#7A7268]"
											>
												Cancel
											</button>
											<button
												type="button"
												onClick={() => removeAdult(adult)}
												className="flex-1 py-2 rounded-xl bg-[#C4714A] text-white text-sm font-medium"
											>
												Remove
											</button>
										</div>
									</div>
								) : (
									<>
										<div className="mb-4">
											<TextInput
												label="Full name"
												type="text"
												placeholder="Jane Smith"
												value={adult.name}
												onChange={(e) => updateAdult(i, "name", e.target.value)}
											/>
										</div>

										<div className="mb-4">
											<DatePicker
												label="Date of birth"
												value={adult.dob}
												onChange={(value) => updateAdult(i, "dob", value)}
												endMonth={new Date()}
											/>
										</div>

										<div className="mb-4">
											<Label className="mb-2 block">
												What&apos;s their role in this application?
											</Label>
											<RoleSelector
												value={adult.role}
												onChange={(role) => updateAdult(i, "role", role)}
											/>
										</div>

										{adult.role === "co-applicant" && (
											<TextInput
												label="Email address"
												type="email"
												placeholder="jane@email.com"
												value={adult.email}
												onChange={(e) =>
													updateAdult(i, "email", e.target.value)
												}
												hint="We'll send them a link to complete their own section of this application."
											/>
										)}
									</>
								)}
							</div>
						))}
					</div>
				)}

				{/* ── Child cards ── */}
				{childList.length > 0 && (
					<div className="mb-4 space-y-3">
						{childList.map((child, i) => (
							<div
								key={child.id}
								className="bg-white rounded-2xl p-5 shadow-[0_1px_4px_rgba(28,26,23,0.07)]"
							>
								<div className="flex items-center gap-3 mb-5">
									<div className="w-9 h-9 rounded-full bg-[#EEF2F8] flex items-center justify-center flex-shrink-0">
										<span
											className="text-sm text-[#5B7BB5]"
											style={{
												fontFamily: "'Fraunces', serif",
												fontWeight: 400,
											}}
										>
											{i + 1}
										</span>
									</div>
									<div>
										<p className="text-sm font-medium text-[#1C1A17]">
											{child.name || `Child ${i + 1}`}
										</p>
										<p className="text-xs text-[#7A7268] mt-0.5">Under 18</p>
									</div>
									<div className="ml-auto">
										<RemoveButton
											onClick={() => setConfirmingRemove(child.id)}
										/>
									</div>
								</div>

								{confirmingRemove === child.id ? (
									<div className="rounded-xl bg-[#FDF0E9] border-2 border-[#C4714A] p-4">
										<p className="text-sm font-medium text-[#1C1A17] mb-1">
											Remove {child.name || "this child"}?
										</p>
										{child.existingId ? (
											<p className="text-xs text-[#7A7268] mb-4 leading-relaxed">
												This will permanently delete their income sources and
												any other information tied to them. This cannot be
												undone.
											</p>
										) : (
											<p className="text-xs text-[#7A7268] mb-4 leading-relaxed">
												This child hasn&apos;t been saved yet, so removing them
												will only clear this card.
											</p>
										)}
										<div className="flex gap-2">
											<button
												type="button"
												onClick={() => setConfirmingRemove(null)}
												className="flex-1 py-2 rounded-xl border-2 border-[#E8E1D9] text-sm text-[#7A7268]"
											>
												Cancel
											</button>
											<button
												type="button"
												onClick={() => removeChild(child)}
												className="flex-1 py-2 rounded-xl bg-[#C4714A] text-white text-sm font-medium"
											>
												Remove
											</button>
										</div>
									</div>
								) : (
									<>
										<div className="mb-4">
											<TextInput
												label="Full name"
												type="text"
												placeholder="Sam Johnson"
												value={child.name}
												onChange={(e) => updateChild(i, "name", e.target.value)}
											/>
										</div>

										<DatePicker
											label="Date of birth"
											value={child.dob}
											onChange={(value) => updateChild(i, "dob", value)}
											endMonth={new Date()}
										/>
									</>
								)}
							</div>
						))}
					</div>
				)}

				{/* ── Lifestyle card ── */}
				<div className="bg-white rounded-2xl p-5 shadow-[0_1px_4px_rgba(28,26,23,0.07)]">
					<SectionLabel>Lifestyle</SectionLabel>

					{/* Pets */}
					<div className="mb-6">
						<div className="flex items-center justify-between mb-3">
							<div>
								<p className="text-sm font-medium text-[#1C1A17]">Pets</p>
								<p className="text-xs text-[#7A7268] mt-0.5">
									Any furry, feathered, or scaly friends?
								</p>
							</div>
							<PawIcon />
						</div>
						<YesNoToggle value={hasPets} onChange={setHasPets} />
					</div>

					<div className="border-t border-[#F0EBE3] mb-6" />

					{/* Smoking */}
					<div>
						<div className="flex items-center justify-between mb-3">
							<div>
								<p className="text-sm font-medium text-[#1C1A17]">Smoking</p>
								<p className="text-xs text-[#7A7268] mt-0.5">
									Will anyone smoke in or near the unit?
								</p>
							</div>
							<NoSmokingIcon />
						</div>
						<YesNoToggle value={smokes} onChange={setSmokes} />
					</div>
				</div>

				{/* ── Pet cards (inline, outside lifestyle card) ── */}
				{hasPets === true && (
					<div className="mt-4 space-y-3">
						{pets.map((pet, i) => (
							<div
								key={pet.id}
								className="bg-white rounded-2xl p-5 shadow-[0_1px_4px_rgba(28,26,23,0.07)]"
							>
								{/* Card header */}
								<div className="flex items-center gap-3 mb-5">
									<div className="w-9 h-9 rounded-full bg-[#F5E8DF] flex items-center justify-center flex-shrink-0 text-base">
										{pet.type === "Dog"
											? "🐕"
											: pet.type === "Cat"
												? "🐈"
												: pet.type === "Bird"
													? "🐦"
													: "🐾"}
									</div>
									<div className="flex-1 min-w-0">
										<p className="text-sm font-medium text-[#1C1A17] truncate">
											{pet.name ||
												(pet.type ? `${pet.type} ${i + 1}` : `Pet ${i + 1}`)}
										</p>
										{pet.breed && (
											<p className="text-xs text-[#7A7268] mt-0.5 truncate">
												{pet.breed}
											</p>
										)}
									</div>
									<RemoveButton onClick={() => removePet(pet.id)} />
								</div>

								{/* Type */}
								<div className="mb-4">
									<Label className="mb-1.5 block">Type of animal</Label>
									<div className="flex flex-wrap gap-2">
										{PET_TYPES.map((t) => (
											<button
												key={t}
												type="button"
												onClick={() => updatePet(pet.id, "type", t)}
												className={`px-3.5 py-2 rounded-xl border-2 text-sm transition-all ${
													pet.type === t
														? "border-[#C4714A] bg-[#FDF0E9] text-[#C4714A] font-medium"
														: "border-[#E8E1D9] bg-white text-[#7A7268]"
												}`}
												style={{ fontFamily: "'DM Sans', sans-serif" }}
											>
												{t}
											</button>
										))}
									</div>
								</div>

								{/* Name */}
								<div className="mb-4">
									<TextInput
										label="Pet's name"
										type="text"
										placeholder="Biscuit"
										value={pet.name}
										onChange={(e) => updatePet(pet.id, "name", e.target.value)}
									/>
								</div>

								{/* Breed */}
								<div className="mb-4">
									<TextInput
										label="Breed"
										type="text"
										placeholder="e.g. Golden Retriever, Domestic shorthair"
										value={pet.breed}
										onChange={(e) => updatePet(pet.id, "breed", e.target.value)}
									/>
								</div>

								{/* Notes */}
								<div>
									<Label className="mb-1.5 block">
										Anything else the landlord should know?
									</Label>
									<Textarea
										rows={3}
										placeholder="Temperament, certifications, special needs..."
										value={pet.notes}
										onChange={(e) => updatePet(pet.id, "notes", e.target.value)}
									/>
								</div>
							</div>
						))}

						{/* Add pet button */}
						<button
							type="button"
							onClick={addPet}
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
							{pets.length === 0 ? "Add a pet" : "Add another pet"}
						</button>
					</div>
				)}
			</div>

			{/* ── Fixed footer CTA ── */}
			<div className="fixed bottom-0 left-0 right-0 pointer-events-none z-20">
				<div className="bg-gradient-to-t from-[#F5F0E8] via-[#F5F0E8]/95 to-transparent pt-8 pb-10 px-5 pointer-events-auto">
					<div className="max-w-lg mx-auto">
						<Button
							variant="continue"
							type="button"
							onClick={() =>
								submit(
									{
										data: JSON.stringify({
											smokes: smokes ?? false,
											additionalAdults: additionalAdults.map((a) => ({
												existingId: a.existingId,
												fullName: a.name,
												dateOfBirth: a.dob,
												role: a.role,
												email: a.email || undefined,
											})),
											children: childList.map((c) => ({
												existingId: c.existingId,
												fullName: c.name,
												dateOfBirth: c.dob,
											})),
											pets: hasPets
												? pets.map((p) => ({
														type: p.type,
														name: p.name || undefined,
														breed: p.breed || undefined,
														notes: p.notes || undefined,
													}))
												: [],
										}),
									},
									{ method: "post" },
								)
							}
						>
							Continue
						</Button>
						<p
							className="text-center text-xs text-[#7A7268] mt-3"
							style={{ fontFamily: "'DM Sans', sans-serif" }}
						>
							Your progress is saved automatically
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}
