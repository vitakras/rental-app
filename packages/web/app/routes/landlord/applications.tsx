import type { SubmittedApplicationSummary } from "api";
import { useEffect, useState } from "react";
import { Form, Link } from "react-router";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "~/components/ui/popover";
import { apiClient } from "~/lib/api";
import type { Route } from "./+types/applications";

export async function clientLoader(_: Route.ClientLoaderArgs) {
	const response = await apiClient.landlord.applications.$get();
	if (!response.ok) {
		throw new Response(null, { status: response.status });
	}
	const { applications } = (await response.json()) as {
		applications: SubmittedApplicationSummary[];
	};
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

interface ShareLinkSheetProps {
	open: boolean;
	onClose: () => void;
}

function ShareLinkSheet({ open, onClose }: ShareLinkSheetProps) {
	const [copied, setCopied] = useState(false);
	const [signupUrl, setSignupUrl] = useState("");
	const [isLoadingLink, setIsLoadingLink] = useState(false);
	const [linkError, setLinkError] = useState("");

	useEffect(() => {
		if (!open) {
			setCopied(false);
			setSignupUrl("");
			setIsLoadingLink(false);
			setLinkError("");
			return;
		}

		let cancelled = false;

		async function loadSignupLink() {
			setCopied(false);
			setIsLoadingLink(true);
			setLinkError("");

			try {
				const response =
					await apiClient.landlord["applicant-signup-url"].$get();

				if (!response.ok) {
					throw new Error(`Request failed with status ${response.status}`);
				}

				const { signupUrl } = (await response.json()) as {
					signupUrl: string;
				};

				if (!cancelled) {
					setSignupUrl(signupUrl);
				}
			} catch {
				if (!cancelled) {
					setSignupUrl("");
					setLinkError("Unable to load the signup link right now.");
				}
			} finally {
				if (!cancelled) {
					setIsLoadingLink(false);
				}
			}
		}

		void loadSignupLink();

		return () => {
			cancelled = true;
		};
	}, [open]);

	function copyLink() {
		if (!signupUrl) return;

		navigator.clipboard.writeText(signupUrl).then(() => {
			setCopied(true);
			setTimeout(() => setCopied(false), 2500);
		});
	}

	if (!open) return null;

	return (
		<>
			<style>{`
				@keyframes sl-fade-in {
					from { opacity: 0; }
					to   { opacity: 1; }
				}
				@keyframes sl-slide-up {
					from { transform: translateY(100%); }
					to   { transform: translateY(0); }
				}
				@keyframes sl-check-draw {
					from { stroke-dashoffset: 30; }
					to   { stroke-dashoffset: 0; }
				}
				@keyframes sl-pop {
					0%   { transform: scale(0.92); opacity: 0; }
					60%  { transform: scale(1.03); }
					100% { transform: scale(1); opacity: 1; }
				}
			`}</style>

			{/* Backdrop */}
			<button
				type="button"
				aria-label="Close"
				className="fixed inset-0 z-40 w-full cursor-default border-0 bg-[#1C1A17]/25 backdrop-blur-[3px]"
				style={{ animation: "sl-fade-in 0.2s ease" }}
				onClick={onClose}
			/>

			{/* Sheet */}
			<div
				className="fixed bottom-0 left-0 right-0 z-50 bg-[#FAF7F2] rounded-t-[28px] shadow-[0_-12px_48px_rgba(28,26,23,0.18)]"
				style={{
					animation: "sl-slide-up 0.35s cubic-bezier(0.32, 0.72, 0, 1)",
				}}
			>
				{/* Drag handle */}
				<div className="flex justify-center pt-3 pb-1">
					<div className="w-9 h-[3px] bg-[#D9D1C7] rounded-full" />
				</div>

				<div className="px-5 pb-10 pt-4">
					{/* Header */}
					<div className="flex items-start justify-between mb-7">
						<div>
							<p className="text-[10px] text-[#C4714A] tracking-widest uppercase font-medium mb-1.5">
								Application link
							</p>
							<h3
								className="text-[1.6rem] leading-tight text-[#1C1A17]"
								style={{ fontFamily: "'Fraunces', serif", fontWeight: 300 }}
							>
								Share with applicants
							</h3>
						</div>
						<button
							type="button"
							onClick={onClose}
							className="mt-1.5 w-8 h-8 flex items-center justify-center rounded-full bg-[#EDE8E2] text-[#7A7268] hover:bg-[#E2DBD3] transition-colors"
							aria-label="Close"
						>
							<svg
								aria-hidden="true"
								width="12"
								height="12"
								viewBox="0 0 12 12"
								fill="none"
							>
								<path
									d="M1 1l10 10M11 1L1 11"
									stroke="currentColor"
									strokeWidth="1.5"
									strokeLinecap="round"
								/>
							</svg>
						</button>
					</div>

					{/* Description */}
					<p className="text-sm text-[#7A7268] leading-relaxed mb-5">
						Send this link to anyone you'd like to apply. They'll create an
						account and fill out the application on their end.
					</p>

					{/* Link display + copy */}
					<div className="bg-white rounded-2xl border border-[#E8E1D9] p-1 flex items-center gap-2 mb-3">
						<div className="flex-1 px-3 py-2.5 overflow-hidden">
							<p className="text-xs text-[#7A7268] mb-0.5 tracking-wider uppercase">
								Signup link
							</p>
							<p className="text-sm text-[#1C1A17] truncate font-mono tracking-tight">
								{isLoadingLink
									? "Loading signup link..."
									: linkError || signupUrl}
							</p>
						</div>
						<button
							type="button"
							onClick={copyLink}
							disabled={!signupUrl || isLoadingLink}
							className={[
								"shrink-0 flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
								copied
									? "bg-[#E8F5EE] text-[#2D8A5E]"
									: signupUrl && !isLoadingLink
										? "bg-[#1C1A17] text-[#F5F0E8] hover:bg-[#2E2B27] shadow-[0_2px_8px_rgba(28,26,23,0.2)] active:scale-[0.96]"
										: "bg-[#D9D1C7] text-[#7A7268] cursor-not-allowed",
							].join(" ")}
						>
							{copied ? (
								<>
									<svg
										aria-hidden="true"
										width="14"
										height="14"
										viewBox="0 0 14 14"
										fill="none"
										style={{ animation: "sl-pop 0.25s ease both" }}
									>
										<path
											d="M2 7.5l3 3 7-7"
											stroke="currentColor"
											strokeWidth="1.8"
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeDasharray="30"
											style={{ animation: "sl-check-draw 0.3s ease both" }}
										/>
									</svg>
									Copied
								</>
							) : (
								<>
									<svg
										aria-hidden="true"
										width="14"
										height="14"
										viewBox="0 0 14 14"
										fill="none"
									>
										<rect
											x="4.5"
											y="4.5"
											width="8"
											height="8"
											rx="1.5"
											stroke="currentColor"
											strokeWidth="1.2"
										/>
										<path
											d="M4.5 9.5H2.5A1 1 0 011.5 8.5v-6A1 1 0 012.5 1.5h6A1 1 0 019.5 2.5v2"
											stroke="currentColor"
											strokeWidth="1.2"
											strokeLinecap="round"
										/>
									</svg>
									Copy
								</>
							)}
						</button>
					</div>

					{/* Hint */}
					<p className="text-[11px] text-[#B8B0A7] pl-0.5">
						Anyone with this link can sign up and submit an application to you.
					</p>
				</div>
			</div>
		</>
	);
}

export default function LandlordApplications({
	loaderData,
}: Route.ComponentProps) {
	const { applications } = loaderData;
	const [inviteOpen, setInviteOpen] = useState(false);

	return (
		<div
			className="min-h-screen bg-[#F5F0E8]"
			style={{ fontFamily: "'DM Sans', sans-serif" }}
		>
			{/* Top bar */}
			<div className="fixed top-0 left-0 right-0 z-30 bg-[#F5F0E8]/90 backdrop-blur-sm border-b border-[#E8E1D9]">
				<div className="max-w-lg mx-auto px-5 py-4 flex items-center justify-between">
					<h1
						className="text-base text-[#1C1A17]"
						style={{ fontFamily: "'Fraunces', serif", fontWeight: 400 }}
					>
						Applications
					</h1>
					<div className="flex items-center gap-3">
						<button
							type="button"
							onClick={() => setInviteOpen(true)}
							className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1C1A17] text-[#F5F0E8] text-xs font-medium hover:bg-[#2E2B27] active:scale-[0.97] transition-all"
						>
							<svg
								aria-hidden="true"
								width="11"
								height="11"
								viewBox="0 0 11 11"
								fill="none"
							>
								<path
									d="M4.5 6.5a2.5 2.5 0 003.536 0l1.25-1.25a2.5 2.5 0 00-3.536-3.536L5.208 2.25"
									stroke="currentColor"
									strokeWidth="1.3"
									strokeLinecap="round"
								/>
								<path
									d="M6.5 4.5a2.5 2.5 0 00-3.536 0L1.714 5.75a2.5 2.5 0 003.536 3.536L5.792 8.75"
									stroke="currentColor"
									strokeWidth="1.3"
									strokeLinecap="round"
								/>
							</svg>
							Share link
						</button>
						<Popover>
							<PopoverTrigger asChild>
								<button
									type="button"
									className="flex items-center gap-1.5 text-[10px] text-[#7A7268] tracking-widest uppercase hover:text-[#1C1A17] transition-colors group"
								>
									Landlord
									<svg
										aria-hidden="true"
										width="8"
										height="8"
										viewBox="0 0 8 8"
										fill="none"
										className="opacity-40 group-hover:opacity-70 transition-opacity mt-px"
									>
										<path
											d="M1.5 3L4 5.5L6.5 3"
											stroke="currentColor"
											strokeWidth="1.2"
											strokeLinecap="round"
											strokeLinejoin="round"
										/>
									</svg>
								</button>
							</PopoverTrigger>
							<PopoverContent
								align="end"
								sideOffset={8}
								className="w-auto min-w-[140px] p-1 bg-[#1C1A17] border-0 rounded-xl shadow-xl ring-0"
							>
								<Form action="/signout" method="post">
									<button
										type="submit"
										className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[#F5F0E8]/70 hover:text-[#F5F0E8] hover:bg-white/5 text-xs tracking-wide transition-colors"
									>
										<svg
											aria-hidden="true"
											width="12"
											height="12"
											viewBox="0 0 12 12"
											fill="none"
											className="shrink-0"
										>
											<path
												d="M4.5 10.5H2.5a1 1 0 01-1-1v-7a1 1 0 011-1h2M8 8.5L10.5 6 8 3.5M10.5 6h-6"
												stroke="currentColor"
												strokeWidth="1.2"
												strokeLinecap="round"
												strokeLinejoin="round"
											/>
										</svg>
										Sign out
									</button>
								</Form>
							</PopoverContent>
						</Popover>
					</div>
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
						<p className="text-sm text-[#7A7268] mb-5">
							Submitted applications will appear here.
						</p>
						<button
							type="button"
							onClick={() => setInviteOpen(true)}
							className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#F5E8DF] text-[#C4714A] text-sm font-medium hover:bg-[#EDD9CC] active:scale-[0.97] transition-all"
						>
							<svg
								aria-hidden="true"
								width="13"
								height="13"
								viewBox="0 0 13 13"
								fill="none"
							>
								<path
									d="M5.5 7.5a3 3 0 004.243 0l1.5-1.5a3 3 0 00-4.243-4.243L6.25 2.5"
									stroke="currentColor"
									strokeWidth="1.2"
									strokeLinecap="round"
								/>
								<path
									d="M7.5 5.5a3 3 0 00-4.243 0L1.757 7a3 3 0 004.243 4.243L6.75 10.5"
									stroke="currentColor"
									strokeWidth="1.2"
									strokeLinecap="round"
								/>
							</svg>
							Share application link
						</button>
					</div>
				) : (
					<div className="space-y-3">
						{applications.map((app) => (
							<Link
								key={app.id}
								to={`/l/applications/${app.id}`}
								className="block bg-white rounded-2xl p-5 shadow-[0_1px_4px_rgba(28,26,23,0.07)] hover:shadow-[0_2px_8px_rgba(28,26,23,0.12)] transition-shadow"
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
							</Link>
						))}
					</div>
				)}
			</div>

			<ShareLinkSheet open={inviteOpen} onClose={() => setInviteOpen(false)} />
		</div>
	);
}
