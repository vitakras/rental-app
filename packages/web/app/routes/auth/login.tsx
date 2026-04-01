import {
	Form,
	Link,
	redirect,
	useActionData,
	useNavigation,
	useSearchParams,
} from "react-router";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { apiClient } from "~/lib/api";
import type { Route } from "./+types/login";

export function meta() {
	return [{ title: "Sign in — Rental Portal" }];
}

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
	const url = new URL(request.url);
	const role = url.searchParams.get("role") ?? "applicant";
	const token = url.searchParams.get("token");

	if (role !== "applicant" || !token) {
		return { signupToken: null };
	}

	return { signupToken: token };
}

export async function clientAction({ request }: Route.ClientActionArgs) {
	const formData = await request.formData();
	const email = formData.get("email") as string;
	const role = formData.get("role") as string;
	const signupToken = formData.get("signupToken");

	if (role === "applicant" && typeof signupToken === "string" && signupToken) {
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

	const response = await apiClient.auth.email.request.$post({
		json: { email },
	});

	if (response.status === 422) {
		const result = await response.json();
		const message =
			"issues" in result
				? (result.issues[0]?.message ?? "Invalid email address")
				: "Invalid email address";
		return { error: message };
	}

	if (!response.ok) {
		return { error: "Something went wrong. Please try again." };
	}

	return redirect(
		`/login/check-email?email=${encodeURIComponent(email)}&role=${encodeURIComponent(role)}`,
	);
}

export default function Login({ loaderData }: Route.ComponentProps) {
	const [searchParams] = useSearchParams();
	const role = searchParams.get("role") ?? "applicant";
	const isLandlord = role === "landlord";
	const signupToken = loaderData?.signupToken ?? null;

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
					to="/"
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
				{/* Heading */}
				<div className="mb-10">
					<p className="text-xs text-[#C4714A] font-medium tracking-widest uppercase mb-3">
						{isLandlord ? "Landlord" : "Applicant"} Portal
					</p>
					<h1
						className="text-[2.8rem] leading-[1.1] text-[#1C1A17] mb-3"
						style={{ fontFamily: "'Fraunces', serif", fontWeight: 300 }}
					>
						Sign in to
						<br />
						<em>your account.</em>
					</h1>
					<p className="text-[#7A7268] text-sm leading-relaxed">
						{signupToken
							? "Enter your email to create your applicant account and continue your application."
							: "Enter your email and we'll send you a secure link to sign in — no password needed."}
					</p>
				</div>

				{/* Form */}
				<Form method="post">
					<input type="hidden" name="role" value={role} />
					{signupToken ? (
						<input type="hidden" name="signupToken" value={signupToken} />
					) : null}

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
						{submitting
							? signupToken
								? "Creating account…"
								: "Sending…"
							: signupToken
								? "Continue to application"
								: "Send sign-in link"}
					</Button>
				</Form>

				{signupToken ? null : (
					<p className="text-center text-xs text-[#7A7268] mt-4 leading-relaxed">
						We'll only send a link if an account exists for that email.
					</p>
				)}
			</div>
		</div>
	);
}
