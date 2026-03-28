import type { Route } from "./+types/applications";
import { repositories } from "~/server/container";

export function links() {
	return [
		{ rel: "preconnect", href: "https://fonts.googleapis.com" },
		{ rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" as const },
		{
			rel: "stylesheet",
			href: "https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;1,9..144,300;1,9..144,400&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap",
		},
	];
}

export async function loader(_: Route.LoaderArgs) {
	const applications = await repositories.applicationRepository.findAllSubmitted();
	return { applications };
}

export function meta() {
	return [{ title: "Applications — Landlord" }];
}

function formatDate(dateStr: string): string {
	const normalized = dateStr.length > 10 ? dateStr.replace(" ", "T") : dateStr;
	return new Intl.DateTimeFormat("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	}).format(new Date(normalized));
}

export default function LandlordApplications({ loaderData }: Route.ComponentProps) {
	const { applications } = loaderData;

	return (
		<div className="min-h-screen bg-[#F5F0E8]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
			{/* Top bar */}
			<div className="fixed top-0 left-0 right-0 z-30 bg-[#F5F0E8]/90 backdrop-blur-sm border-b border-[#E8E1D9]">
				<div className="max-w-lg mx-auto px-5 py-4 flex items-center justify-between">
					<h1
						className="text-base text-[#1C1A17]"
						style={{ fontFamily: "'Fraunces', serif", fontWeight: 400 }}
					>
						Applications
					</h1>
					<span className="text-[10px] text-[#7A7268] tracking-widest uppercase">
						Landlord
					</span>
				</div>
			</div>

			{/* Content */}
			<div className="max-w-lg mx-auto px-5 pt-[72px] pb-12">
				<div className="mt-8 mb-6">
					<p className="text-xs text-[#C4714A] tracking-widest uppercase font-medium mb-2">
						Submitted
					</p>
					<h2
						className="text-[2rem] leading-tight text-[#1C1A17]"
						style={{ fontFamily: "'Fraunces', serif", fontWeight: 300 }}
					>
						{applications.length === 0
							? "No applications yet."
							: `${applications.length} application${applications.length !== 1 ? "s" : ""}`}
					</h2>
				</div>

				{applications.length === 0 ? (
					<div className="bg-white rounded-2xl p-8 shadow-[0_1px_4px_rgba(28,26,23,0.07)] text-center">
						<p className="text-sm text-[#7A7268]">
							Submitted applications will appear here.
						</p>
					</div>
				) : (
					<div className="space-y-3">
						{applications.map((app) => (
							<div
								key={app.id}
								className="bg-white rounded-2xl p-5 shadow-[0_1px_4px_rgba(28,26,23,0.07)]"
							>
								<div className="flex items-start justify-between gap-4 mb-3">
									<div className="min-w-0">
										<p className="text-sm font-medium text-[#1C1A17] truncate">
											{app.primaryApplicantName}
										</p>
										<p className="text-xs text-[#7A7268] mt-0.5">#{app.id}</p>
									</div>
									<span className="shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[#F5E8DF] text-[#C4714A]">
										{app.status.charAt(0).toUpperCase() + app.status.slice(1)}
									</span>
								</div>
								<div className="flex gap-6 pt-3 border-t border-[#F0EBE3]">
									<div>
										<p className="text-[10px] text-[#7A7268] mb-0.5 uppercase tracking-wider">
											Move-in
										</p>
										<p className="text-sm text-[#1C1A17]">
											{formatDate(app.desiredMoveInDate)}
										</p>
									</div>
									<div>
										<p className="text-[10px] text-[#7A7268] mb-0.5 uppercase tracking-wider">
											Submitted
										</p>
										<p className="text-sm text-[#1C1A17]">
											{formatDate(app.createdAt)}
										</p>
									</div>
								</div>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
