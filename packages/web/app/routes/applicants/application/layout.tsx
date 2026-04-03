import {
	Link,
	Outlet,
	useLocation,
	useNavigate,
	useParams,
} from "react-router";
import { cn } from "~/lib/utils";

const STEPS = [
	{ slug: "applicant", label: "Applicant" },
	{ slug: "occupants", label: "Occupants" },
	{ slug: "income", label: "Income" },
	{ slug: "residence", label: "Residence" },
	{ slug: "documents", label: "Documents" },
	{ slug: "", label: "Review" },
] as const;

// ── Check icon ────────────────────────────────────────────────────────────────

function CheckIcon() {
	return (
		<svg
			aria-hidden="true"
			width="14"
			height="14"
			viewBox="0 0 14 14"
			fill="none"
			stroke="currentColor"
			strokeWidth="2.5"
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<path d="M2.5 7l3.5 3.5 5.5-6" />
		</svg>
	);
}

// ── StepNavigator ─────────────────────────────────────────────────────────────

function StepNavigator({
	currentIndex,
	onNavigate,
}: {
	currentIndex: number;
	onNavigate: (slug: string) => void;
}) {
	return (
		<div
			className="flex items-start justify-between"
			role="list"
			aria-label="Application steps"
		>
			{STEPS.map((step, i) => {
				const state =
					i < currentIndex
						? "completed"
						: i === currentIndex
							? "current"
							: "upcoming";
				const isLast = i === STEPS.length - 1;

				return (
					<div
						key={step.slug}
						className="flex items-start flex-1"
						role="listitem"
					>
						<div className="flex flex-col items-center flex-shrink-0">
							<button
								type="button"
								aria-current={state === "current" ? "step" : undefined}
								aria-label={`${step.label}${state === "completed" ? " (completed)" : ""}`}
								onClick={() => onNavigate(step.slug)}
								className={cn(
									"w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300",
									"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C4714A]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F5F0E8]",
									state === "completed" && "bg-[#C4714A] text-white",
									state === "current" &&
										"bg-[#C4714A] text-white shadow-[0_2px_8px_rgba(196,113,74,0.35)]",
									state === "upcoming" &&
										"bg-transparent border border-[#D8CFC7] text-[#7A7268]",
								)}
							>
								{state === "completed" ? (
									<CheckIcon />
								) : (
									<span
										className={cn(
											"text-sm leading-none",
											state === "current" && "font-semibold",
										)}
									>
										{i + 1}
									</span>
								)}
							</button>

							<span
								className={cn(
									"mt-1.5 text-[10px] tracking-wide text-center leading-tight",
									state === "current" && "text-[#1C1A17] font-semibold",
									state === "completed" && "text-[#7A7268] font-medium",
									state === "upcoming" && "text-[#B5AFA8]",
								)}
							>
								{step.label}
							</span>
						</div>

						{!isLast && (
							<div
								className="flex-1 h-[1.5px] mt-[22px] mx-1 transition-colors duration-500"
								style={{
									backgroundColor:
										state === "completed" ? "#C4714A" : "#E8E1D9",
								}}
							/>
						)}
					</div>
				);
			})}
		</div>
	);
}

// ── Shell ─────────────────────────────────────────────────────────────────────

export default function ApplicationShell() {
	const { id } = useParams();
	const location = useLocation();
	const navigate = useNavigate();

	const basePath = `/a/applications/${id}`;
	const currentIndex = STEPS.findIndex((step) =>
		step.slug
			? location.pathname.endsWith(`/${step.slug}`)
			: location.pathname === basePath,
	);

	return (
		<div
			className="min-h-screen bg-[#F5F0E8]"
			style={{ fontFamily: "'DM Sans', sans-serif" }}
		>
			<div className="fixed top-0 left-0 right-0 z-30 bg-[#F5F0E8]/90 backdrop-blur-sm border-b border-[#E8E1D9]/60">
				<div className="max-w-lg mx-auto px-5 pt-3 pb-4">
					<div className="flex items-center justify-between mb-3">
						<Link
							to="/a"
							className="flex items-center gap-1 text-xs text-[#7A7268] hover:text-[#1C1A17] transition-colors"
							style={{ fontFamily: "'DM Sans', sans-serif" }}
						>
							<svg
								width="13"
								height="13"
								viewBox="0 0 13 13"
								fill="none"
								stroke="currentColor"
								strokeWidth="1.5"
								strokeLinecap="round"
								strokeLinejoin="round"
								aria-hidden="true"
							>
								<path d="M8.5 2.5l-5 4 5 4" />
							</svg>
							My Applications
						</Link>
					</div>
					<StepNavigator
						currentIndex={currentIndex}
						onNavigate={(slug) =>
							navigate(slug ? `${basePath}/${slug}` : basePath)
						}
					/>
				</div>
			</div>

			<Outlet />
		</div>
	);
}
