import { Link, redirect } from "react-router";
import { apiClient } from "~/lib/api";
import type { Route } from "./+types/verify";

export function meta() {
	return [{ title: "Signing you in — Rental Portal" }];
}

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
	const url = new URL(request.url);
	const email = url.searchParams.get("email");
	const token = url.searchParams.get("token");

	if (!email || !token) {
		return { error: "This sign-in link is incomplete. Please request a new one." };
	}

	const response = await apiClient.auth.email.verify.$post({
		json: { email, token },
	});

	if (response.status === 401 || response.status === 422) {
		return {
			error: "This sign-in link has expired or already been used. Please request a new one.",
		};
	}

	if (!response.ok) {
		return { error: "Something went wrong. Please try again." };
	}

	const result = await response.json();

	if ("user" in result && result.user.globalRole === "landlord") {
		return redirect("/l/applications");
	}

	return redirect("/apply");
}

function BackArrow() {
	return (
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
	);
}

export default function Verify({ loaderData }: Route.ComponentProps) {
	const { error } = loaderData;

	return (
		<div
			className="min-h-screen bg-[#F5F0E8] flex flex-col justify-center items-center px-5"
			style={{ fontFamily: "'DM Sans', sans-serif" }}
		>
			<div className="w-full max-w-sm">
				{/* Icon */}
				<div className="w-14 h-14 bg-[#C4714A]/10 rounded-2xl flex items-center justify-center mb-8">
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
						<circle cx="12" cy="12" r="10" />
						<path d="M12 8v4m0 4h.01" />
					</svg>
				</div>

				<p className="text-xs text-[#C4714A] font-medium tracking-widest uppercase mb-3">
					Link invalid
				</p>
				<h1
					className="text-[2.4rem] leading-[1.1] text-[#1C1A17] mb-4"
					style={{ fontFamily: "'Fraunces', serif", fontWeight: 300 }}
				>
					Unable to
					<br />
					<em>sign you in.</em>
				</h1>

				<p className="text-[#7A7268] text-sm leading-relaxed mb-10">{error}</p>

				<Link
					to="/login"
					className="inline-flex items-center gap-1.5 text-sm text-[#7A7268] hover:text-[#1C1A17] transition-colors"
				>
					<BackArrow />
					Back to sign in
				</Link>
			</div>
		</div>
	);
}
