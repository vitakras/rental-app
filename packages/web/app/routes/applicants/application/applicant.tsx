import { useState } from "react";
import { data, redirect, useSubmit } from "react-router";
import { Button } from "~/components/ui/button";
import { DatePicker } from "~/components/ui/date-picker";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { apiClient } from "~/lib/api";
import type { Route } from "./+types/applicant";

export function meta() {
	return [{ title: "Your Info — Rental Application" }];
}

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
	const id = Number(params.id);
	if (!Number.isInteger(id) || id <= 0) throw data(null, { status: 404 });

	const [applicationResponse, sessionResponse] = await Promise.all([
		apiClient.applications[":id"].$get({ param: { id: String(id) } }),
		apiClient.auth.email.session.$get(),
	]);

	if (applicationResponse.status === 404) throw data(null, { status: 404 });
	if (!applicationResponse.ok)
		throw data(null, { status: applicationResponse.status });

	const { application } = (await applicationResponse.json()) as {
		application: {
			id: number;
			desiredMoveInDate: string | null;
			residents: Array<{
				role: string;
				fullName: string;
				dateOfBirth: string;
				email: string | null;
				phone: string | null;
			}>;
		};
	};

	const sessionEmail = sessionResponse.ok
		? ((await sessionResponse.json()) as { user: { email: string } }).user.email
		: null;

	const primary = application.residents.find((r) => r.role === "primary");

	return {
		applicationId: id,
		fullName: primary?.fullName ?? "",
		dateOfBirth: primary?.dateOfBirth ?? "",
		email: primary?.email || sessionEmail || "",
		phone: primary?.phone ?? "",
		desiredMoveInDate: application.desiredMoveInDate ?? "",
		sessionEmail,
	};
}

export async function clientAction({
	request,
	params,
}: Route.ClientActionArgs) {
	const id = Number(params.id);
	if (!Number.isInteger(id) || id <= 0) throw data(null, { status: 404 });

	const formData = await request.formData();
	const raw = JSON.parse(formData.get("data") as string);

	const response = await apiClient.applications[":id"].applicant.$put({
		param: { id: String(id) },
		json: raw,
	});

	if (response.status === 422) {
		const result = await response.json();
		return { errors: result.issues };
	}
	if (!response.ok) throw data(null, { status: response.status });

	return redirect(`/a/applications/${id}/occupants`);
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

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ApplicationApplicant({
	loaderData,
}: Route.ComponentProps) {
	const submit = useSubmit();

	const [fullName, setFullName] = useState(loaderData.fullName);
	const email = loaderData.email;
	const [phone, setPhone] = useState(loaderData.phone);
	const [ownerDob, setOwnerDob] = useState(loaderData.dateOfBirth);
	const [moveInDate, setMoveInDate] = useState(loaderData.desiredMoveInDate);

	return (
		<>
			{/* ── Scrollable content ── */}
			<div className="max-lg mx-auto px-5 pt-24 pb-36 max-w-lg">
				{/* Heading */}
				<div className="mt-8 mb-8">
					<h1
						className="text-[1.55rem] leading-[1.25] text-[#1C1A17] mb-3"
						style={{ fontFamily: "'Fraunces', serif", fontWeight: 300 }}
					>
						Let's start with <em>the basics.</em>
					</h1>
					<p
						className="text-[#7A7268] text-sm leading-relaxed"
						style={{ fontFamily: "'DM Sans', sans-serif" }}
					>
						Tell us a little about yourself.
					</p>
				</div>

				{/* ── Owner card ── */}
				<div className="bg-white rounded-2xl p-5 mb-4 shadow-[0_1px_4px_rgba(28,26,23,0.07)]">
					<SectionLabel>About you</SectionLabel>

					<div className="mb-4">
						<TextInput
							label="Full name"
							type="text"
							placeholder="Alex Johnson"
							value={fullName}
							onChange={(e) => setFullName(e.target.value)}
						/>
					</div>

					<div className="mb-4">
						<DatePicker
							label="Date of birth"
							value={ownerDob}
							onChange={setOwnerDob}
							endMonth={new Date()}
						/>
					</div>

					<div className="mb-4">
						<TextInput
							label="Email address"
							type="email"
							value={email}
							readOnly
							autoComplete="off"
							className="bg-[#F5F0E8] text-[#7A7268] cursor-default"
						/>
					</div>

					<TextInput
						label="Phone number"
						type="tel"
						placeholder="(555) 000-0000"
						value={phone}
						onChange={(e) => setPhone(e.target.value)}
					/>
				</div>

				{/* ── Move-in date card ── */}
				<div className="bg-white rounded-2xl p-5 shadow-[0_1px_4px_rgba(28,26,23,0.07)]">
					<SectionLabel>Move-in date</SectionLabel>
					<DatePicker
						label="When would you like to move in?"
						value={moveInDate}
						onChange={setMoveInDate}
						buttonClassName="text-sm"
					/>
					<p
						className="text-xs text-[#7A7268] mt-2"
						style={{ fontFamily: "'DM Sans', sans-serif" }}
					>
						Not sure yet? Pick an approximate date — you can update it later.
					</p>
				</div>
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
											desiredMoveInDate: moveInDate,
											fullName,
											dateOfBirth: ownerDob,
											email,
											phone,
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
		</>
	);
}
