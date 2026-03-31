import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

export function meta() {
	return [{ title: "Sign in — Rental Portal" }];
}

export default function Login() {
	const [searchParams] = useSearchParams();
	const role = searchParams.get("role") ?? "applicant";
	const isLandlord = role === "landlord";

	const [email, setEmail] = useState("");
	const [loading, setLoading] = useState(false);
	const navigate = useNavigate();

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setLoading(true);
		// TODO: call auth API → apiClient.auth["magic-link"].$post({ json: { email, role } })
		navigate(
			`/login/check-email?email=${encodeURIComponent(email)}&role=${role}`,
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
						Enter your email and we'll send you a secure link to sign in — no
						password needed.
					</p>
				</div>

				{/* Form */}
				<form onSubmit={handleSubmit}>
					<div className="bg-white rounded-2xl p-5 shadow-[0_1px_4px_rgba(28,26,23,0.07)] mb-4">
						<Label htmlFor="email" className="mb-1.5 block">
							Email address
						</Label>
						<Input
							id="email"
							type="email"
							placeholder="you@example.com"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							required
							autoFocus
						/>
					</div>

					<Button
						variant="continue"
						type="submit"
						disabled={loading || !email.trim()}
					>
						{loading ? "Sending…" : "Send sign-in link"}
					</Button>
				</form>

				<p className="text-center text-xs text-[#7A7268] mt-4 leading-relaxed">
					We'll only send a link if an account exists for that email.
				</p>
			</div>
		</div>
	);
}
