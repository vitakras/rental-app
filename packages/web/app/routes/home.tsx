import { useNavigate } from "react-router";
import type { Route } from "./+types/home";

export function meta(_: Route.MetaArgs) {
	return [
		{ title: "Rental Portal" },
		{ name: "description", content: "Sign in to your rental portal" },
	];
}

function ArrowRight() {
	return (
		<svg
			width="18"
			height="18"
			viewBox="0 0 18 18"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.5"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<path d="M3.75 9h10.5M9.75 4.5 14.25 9l-4.5 4.5" />
		</svg>
	);
}

export default function Home() {
	const navigate = useNavigate();

	return (
		<div
			className="min-h-screen bg-[#F5F0E8] flex flex-col"
			style={{ fontFamily: "'DM Sans', sans-serif" }}
		>
			{/* Top bar */}
			<div className="px-6 pt-8 pb-0">
				<p className="text-xs text-[#C4714A] font-medium tracking-widest uppercase">
					Rental Portal
				</p>
			</div>

			{/* Main */}
			<div className="flex-1 flex flex-col justify-center items-center px-5 py-12">
				<div className="w-full max-w-sm">
					{/* Heading */}
					<div className="mb-10">
						<h1
							className="text-[3rem] leading-[1.1] text-[#1C1A17] mb-3"
							style={{ fontFamily: "'Fraunces', serif", fontWeight: 300 }}
						>
							Who are you
							<br />
							<em>here today?</em>
						</h1>
						<p className="text-[#7A7268] text-sm leading-relaxed">
							Sign in to manage your rental experience.
						</p>
					</div>

					{/* Role cards */}
					<div className="space-y-3">
						{/* Landlord */}
						<button
							type="button"
							onClick={() => navigate("/login?role=landlord")}
							className="w-full bg-[#1C1A17] rounded-2xl p-6 text-left group transition-all hover:bg-[#2A2825] active:scale-[0.99]"
						>
							<div className="flex items-center justify-between">
								<div>
									<p className="text-xs text-[#C4714A] tracking-widest uppercase font-medium mb-1.5">
										I'm a
									</p>
									<p
										className="text-[1.6rem] leading-tight text-[#F5F0E8] mb-1.5"
										style={{ fontFamily: "'Fraunces', serif", fontWeight: 300 }}
									>
										Landlord
									</p>
									<p className="text-[#7A7268] text-sm">
										Manage applications &amp; tenants
									</p>
								</div>
								<span className="text-[#C4714A] opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all">
									<ArrowRight />
								</span>
							</div>
						</button>

						{/* Applicant */}
						<button
							type="button"
							onClick={() => navigate("/login?role=applicant")}
							className="w-full bg-white rounded-2xl p-6 text-left group border border-[#E8E1D9] transition-all hover:border-[#C4714A] active:scale-[0.99]"
						>
							<div className="flex items-center justify-between">
								<div>
									<p className="text-xs text-[#C4714A] tracking-widest uppercase font-medium mb-1.5">
										I'm an
									</p>
									<p
										className="text-[1.6rem] leading-tight text-[#1C1A17] mb-1.5"
										style={{ fontFamily: "'Fraunces', serif", fontWeight: 300 }}
									>
										Applicant
									</p>
									<p className="text-[#7A7268] text-sm">
										Apply for a rental home
									</p>
								</div>
								<span className="text-[#C4714A] opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all">
									<ArrowRight />
								</span>
							</div>
						</button>
					</div>
				</div>
			</div>

			{/* Footer */}
			<div className="px-6 pb-8 text-center">
				<p className="text-xs text-[#B8B0A6]">
					Secure sign-in · No password needed
				</p>
			</div>
		</div>
	);
}
