import { useState } from "react";
import { redirect, useSubmit } from "react-router";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { createApiClient } from "~/lib/api";
import type { Route } from "./+types/apply";

export function meta() {
	return [{ title: "Apply — Find Your Home" }];
}

export async function action({ request }: Route.ActionArgs) {
	const formData = await request.formData();
	const raw = JSON.parse(formData.get("data") as string);
	const api = createApiClient();

	const response = await api.applications.$post({
		json: raw,
	});

	if (response.status === 422) {
		const result = await response.json();
		return { errors: result.issues };
	}

	if (!response.ok) {
		throw new Response(null, { status: response.status });
	}

	const result = (await response.json()) as { applicationId: number };
	return redirect(`/applications/${result.applicationId}/occupants`);
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

export default function Apply() {
	const submit = useSubmit();

	const [fullName, setFullName] = useState("");
	const [email, setEmail] = useState("");
	const [phone, setPhone] = useState("");
	const [ownerDob, setOwnerDob] = useState("");
	const [moveInDate, setMoveInDate] = useState("");

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
						style={{ width: "25%" }}
					/>
				</div>
				<div className="bg-[#F5F0E8]/90 backdrop-blur-sm">
					<div className="max-w-lg mx-auto px-5 py-3 flex items-center justify-between">
						<Button
							type="button"
							variant="ghost-muted"
							size="sm"
							className="gap-1 py-1"
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
							Step 1 of 4
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
						Let's start with
						<br />
						<em>the basics.</em>
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
						<TextInput
							label="Date of birth"
							type="date"
							value={ownerDob}
							onChange={(e) => setOwnerDob(e.target.value)}
						/>
					</div>

					<div className="mb-4">
						<TextInput
							label="Email address"
							type="email"
							placeholder="alex@email.com"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
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
					<Label className="block text-sm font-medium text-[#1C1A17] mb-3">
						When would you like to move in?
					</Label>
					<Input
						type="date"
						value={moveInDate}
						onChange={(e) => setMoveInDate(e.target.value)}
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
											owner: {
												fullName,
												dateOfBirth: ownerDob,
												email,
												phone,
											},
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
