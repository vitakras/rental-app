import { Form, Link, redirect, useLoaderData } from "react-router";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import type { Route } from "./+types/login";

export function meta() {
	return [{ title: "Sign in — Rental Portal" }];
}

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
	const url = new URL(request.url);
	const role = url.searchParams.get("role") ?? "applicant";
	return { role };
}

export async function clientAction({ request }: Route.ClientActionArgs) {
	const formData = await request.formData();
	const email = formData.get("email") as string;
	const role = formData.get("role") as string;
	sessionStorage.setItem("otp_email", email);
	sessionStorage.setItem("otp_role", role);
	return redirect("/otp");
}

export default function Login() {
	const { role } = useLoaderData<typeof clientLoader>();
	const isLandlord = role === "landlord";

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
						Enter your email to sign in with your 6-digit access code.
					</p>
				</div>

				{/* Form */}
				<Form method="post">
					<input type="hidden" name="role" value={role} />
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
						/>
					</div>

					<Button variant="continue" type="submit">
						Continue
					</Button>
				</Form>
			</div>
		</div>
	);
}
