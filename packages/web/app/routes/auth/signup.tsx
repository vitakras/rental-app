import {
	Form,
	Link,
	redirect,
	useActionData,
	useNavigation,
} from "react-router";
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

	return redirect("/a/apply");
}

export default function Signup({ loaderData }: Route.ComponentProps) {
	const { signupToken } = loaderData;
	const actionData = useActionData<typeof clientAction>();
	const navigation = useNavigation();
	const submitting = navigation.state === "submitting";
	const error = actionData?.error;

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
								property or company you're applying with. Check your email for an
								invitation, or reach out to them directly to request one.
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
