import { useState } from "react";
import { Form, Link, useActionData, useNavigation } from "react-router";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { apiClient } from "~/lib/api";
import type { Route } from "./+types/signup";

export function meta() {
	return [{ title: "Create account — Rental Portal" }];
}

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
	const url = new URL(request.url);
	const token = url.searchParams.get("token");
	return { signupToken: token ?? null };
}

export async function clientAction({ request }: Route.ClientActionArgs) {
	const formData = await request.formData();
	const email = formData.get("email") as string;
	const signupToken = formData.get("signupToken") as string;

	const response = await apiClient.auth.email.signup.$post({
		json: { email, signupToken },
	});

	if (response.status === 422) {
		const result = await response.json();
		const message =
			"issues" in result
				? (result.issues[0]?.message ?? "Invalid email address")
				: "Invalid email address";
		return { error: message };
	}

	if (response.status === 401) {
		return {
			error:
				"This signup link is invalid or expired. Please request a new one.",
		};
	}

	if (response.status === 409) {
		return {
			error: "An account already exists for this email. Please sign in.",
		};
	}

	if (!response.ok) {
		return { error: "Something went wrong. Please try again." };
	}

	const data = await response.json();
	return { loginCode: "loginCode" in data ? (data.loginCode as string) : null };
}

export default function Signup({ loaderData }: Route.ComponentProps) {
	const { signupToken } = loaderData;
	const actionData = useActionData<typeof clientAction>();
	const navigation = useNavigation();
	const submitting = navigation.state === "submitting";
	const error =
		actionData && "error" in actionData ? actionData.error : undefined;
	const loginCode =
		actionData && "loginCode" in actionData ? actionData.loginCode : null;
	const [copied, setCopied] = useState(false);

	function handleCopy() {
		if (!loginCode) return;
		navigator.clipboard.writeText(loginCode);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	}

	if (loginCode) {
		return (
			<div
				className="min-h-screen bg-[#F5F0E8]"
				style={{ fontFamily: "'DM Sans', sans-serif" }}
			>
				<div className="max-w-md mx-auto px-5 pt-14 pb-16">
					{/* Icon */}
					<div className="w-14 h-14 bg-[#C4714A]/10 rounded-2xl flex items-center justify-center mb-8">
						<svg
							width="26"
							height="26"
							viewBox="0 0 24 24"
							fill="none"
							stroke="#C4714A"
							strokeWidth="1.5"
							strokeLinecap="round"
							strokeLinejoin="round"
							aria-hidden="true"
						>
							<path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
						</svg>
					</div>

					{/* Heading */}
					<div className="mb-8">
						<p className="text-xs text-[#C4714A] font-medium tracking-widest uppercase mb-3">
							Applicant Portal
						</p>
						<h1
							className="text-[2.8rem] leading-[1.1] text-[#1C1A17] mb-3"
							style={{ fontFamily: "'Fraunces', serif", fontWeight: 300 }}
						>
							Your access
							<br />
							<em>code.</em>
						</h1>
						<p className="text-[#7A7268] text-sm leading-relaxed">
							This is the code you'll use every time you sign in. You won't be
							shown it again — write it somewhere safe.
						</p>
					</div>

					{/* Code card */}
					<div className="bg-white rounded-2xl p-6 shadow-[0_1px_4px_rgba(28,26,23,0.07)] mb-4">
						<p className="text-xs font-medium text-[#7A7268] uppercase tracking-widest mb-5">
							Your login code
						</p>

						{/* Digit display */}
						<div className="flex justify-center gap-2 mb-6">
							{loginCode.split("").map((digit, i) => (
								<div
									// biome-ignore lint/suspicious/noArrayIndexKey: fixed-length display only
									key={i}
									className="w-12 h-14 rounded-xl border border-[#E8E1D9] bg-[#F5F0E8] flex items-center justify-center"
									style={{ fontFamily: "'Fraunces', serif", fontWeight: 500 }}
								>
									<span className="text-[1.75rem] leading-none text-[#1C1A17]">
										{digit}
									</span>
								</div>
							))}
						</div>

						{/* Copy button */}
						<button
							type="button"
							onClick={handleCopy}
							className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-[#E8E1D9] text-sm text-[#7A7268] hover:text-[#1C1A17] hover:border-[#C4B89A] transition-colors"
						>
							{copied ? (
								<>
									<svg
										width="15"
										height="15"
										viewBox="0 0 24 24"
										fill="none"
										stroke="#C4714A"
										strokeWidth="2"
										strokeLinecap="round"
										strokeLinejoin="round"
										aria-hidden="true"
									>
										<polyline points="20 6 9 17 4 12" />
									</svg>
									<span className="text-[#C4714A] font-medium">Copied!</span>
								</>
							) : (
								<>
									<svg
										width="15"
										height="15"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="1.5"
										strokeLinecap="round"
										strokeLinejoin="round"
										aria-hidden="true"
									>
										<rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
										<path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
									</svg>
									Copy code
								</>
							)}
						</button>
					</div>

					{/* Warning card */}
					<div className="bg-[#FDF3EC] rounded-2xl p-5 mb-6 flex gap-3">
						<svg
							width="18"
							height="18"
							viewBox="0 0 24 24"
							fill="none"
							stroke="#C4714A"
							strokeWidth="1.5"
							strokeLinecap="round"
							strokeLinejoin="round"
							className="mt-0.5 shrink-0"
							aria-hidden="true"
						>
							<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
							<line x1="12" y1="9" x2="12" y2="13" />
							<line x1="12" y1="17" x2="12.01" y2="17" />
						</svg>
						<p className="text-sm text-[#7A7268] leading-relaxed">
							<span className="font-medium text-[#1C1A17]">
								Write this down.
							</span>{" "}
							This code is the only way to sign back into your applicant portal.
							Store it somewhere safe like a notes app or password manager.
						</p>
					</div>

					{/* CTA */}
					<Link
						to="/a"
						className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1C1A17] px-4 py-3.5 text-sm font-medium text-white hover:bg-[#2E2B26] transition-colors"
					>
						I've saved my code — continue
						<svg
							width="16"
							height="16"
							viewBox="0 0 16 16"
							fill="none"
							stroke="currentColor"
							strokeWidth="1.5"
							strokeLinecap="round"
							strokeLinejoin="round"
							aria-hidden="true"
						>
							<path d="M6 12l4-4-4-4" />
						</svg>
					</Link>
				</div>
			</div>
		);
	}

	return (
		<div
			className="min-h-screen bg-[#F5F0E8]"
			style={{ fontFamily: "'DM Sans', sans-serif" }}
		>
			{/* Back link */}
			<div className="px-5 py-5">
				<Link
					to="/login"
					className="inline-flex items-center gap-1.5 text-sm text-[#7A7268] hover:text-[#1C1A17] transition-colors"
				>
					<svg
						width="16"
						height="16"
						viewBox="0 0 16 16"
						fill="none"
						stroke="currentColor"
						strokeWidth="1.5"
						strokeLinecap="round"
						strokeLinejoin="round"
						aria-hidden="true"
					>
						<path d="M10 12L6 8l4-4" />
					</svg>
					Back
				</Link>
			</div>

			<div className="max-w-md mx-auto px-5 pt-6 pb-16">
				{signupToken ? (
					<>
						{/* Heading */}
						<div className="mb-10">
							<p className="text-xs text-[#C4714A] font-medium tracking-widest uppercase mb-3">
								Applicant Portal
							</p>
							<h1
								className="text-[2.8rem] leading-[1.1] text-[#1C1A17] mb-3"
								style={{ fontFamily: "'Fraunces', serif", fontWeight: 300 }}
							>
								Create your
								<br />
								<em>account.</em>
							</h1>
							<p className="text-[#7A7268] text-sm leading-relaxed">
								Enter your email to create your applicant account and continue
								your application.
							</p>
						</div>

						{/* Form */}
						<Form method="post">
							<input type="hidden" name="signupToken" value={signupToken} />

							<div className="bg-white rounded-2xl p-5 shadow-[0_1px_4px_rgba(28,26,23,0.07)] mb-4">
								<Label htmlFor="email" className="mb-1.5 block">
									Email address
								</Label>
								<Input
									id="email"
									name="email"
									type="email"
									placeholder="you@example.com"
									required
									autoFocus
									aria-describedby={error ? "email-error" : undefined}
								/>
								{error && (
									<p id="email-error" className="text-sm text-red-600 mt-2">
										{error}
									</p>
								)}
							</div>

							<Button variant="continue" type="submit" disabled={submitting}>
								{submitting ? "Creating account…" : "Continue to application"}
							</Button>
						</Form>
					</>
				) : (
					<>
						{/* No token state */}
						<div className="mb-10">
							<p className="text-xs text-[#C4714A] font-medium tracking-widest uppercase mb-3">
								Applicant Portal
							</p>
							<h1
								className="text-[2.8rem] leading-[1.1] text-[#1C1A17] mb-3"
								style={{ fontFamily: "'Fraunces', serif", fontWeight: 300 }}
							>
								You'll need
								<br />
								<em>an invite.</em>
							</h1>
						</div>

						<div className="bg-white rounded-2xl p-6 shadow-[0_1px_4px_rgba(28,26,23,0.07)]">
							{/* Icon */}
							<div className="w-12 h-12 rounded-xl bg-[#FDF3EC] flex items-center justify-center mb-4">
								<svg
									width="24"
									height="24"
									viewBox="0 0 24 24"
									fill="none"
									stroke="#C4714A"
									strokeWidth="1.5"
									strokeLinecap="round"
									strokeLinejoin="round"
									aria-hidden="true"
								>
									<rect x="2" y="7" width="20" height="14" rx="2" />
									<path d="M16 3H8a2 2 0 0 0-2 2v2h12V5a2 2 0 0 0-2-2Z" />
									<path d="m2 7 10 7 10-7" />
								</svg>
							</div>

							<h2
								className="text-lg text-[#1C1A17] mb-2"
								style={{ fontFamily: "'Fraunces', serif", fontWeight: 400 }}
							>
								No signup code found
							</h2>
							<p className="text-sm text-[#7A7268] leading-relaxed">
								To create an account, you'll need a signup link from the
								property or company you're applying with. Check your email for
								an invitation, or reach out to them directly to request one.
							</p>

							<div className="mt-5 pt-5 border-t border-[#F0EBE3]">
								<p className="text-xs text-[#7A7268]">
									Already have an account?{" "}
									<Link
										to="/login"
										className="text-[#C4714A] hover:underline font-medium"
									>
										Sign in
									</Link>
								</p>
							</div>
						</div>
					</>
				)}
			</div>
		</div>
	);
}
