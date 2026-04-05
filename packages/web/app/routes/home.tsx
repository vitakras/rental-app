import { useNavigate } from "react-router";
import type { Route } from "./+types/home";

export function meta(_: Route.MetaArgs) {
	return [
		{ title: "Rental Application" },
		{ name: "description", content: "Find your next home" },
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
							Your next home
							<br />
							<em>starts here.</em>
						</h1>
						<p className="text-[#7A7268] text-sm leading-relaxed">
							Sign in to view and submit your rental application.
						</p>
					</div>

					{/* Applicant card */}
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

			{/* Footer */}
			<div className="px-6 pb-8 text-center">
				<button
					type="button"
					onClick={() => navigate("/login?role=landlord")}
					className="text-xs text-[#B8B0A6] hover:text-[#7A7268] transition-colors underline underline-offset-2 decoration-[#D4CBBD]"
				>
					Landlord? Sign in here
				</button>
			</div>
		</div>
	);
}
