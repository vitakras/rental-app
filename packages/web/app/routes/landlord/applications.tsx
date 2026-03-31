import { useEffect, useRef, useState } from "react";
import type { SubmittedApplicationSummary } from "api";
import { Link } from "react-router";
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

function isValidEmail(email: string): boolean {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

interface InviteSheetProps {
	open: boolean;
	onClose: () => void;
}

function InviteSheet({ open, onClose }: InviteSheetProps) {
	const [emails, setEmails] = useState<string[]>([]);
	const [emailInput, setEmailInput] = useState("");
	const [property, setProperty] = useState("");
	const [message, setMessage] = useState("");
	const [sent, setSent] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (!open) {
			const t = setTimeout(() => {
				setEmails([]);
				setEmailInput("");
				setProperty("");
				setMessage("");
				setSent(false);
			}, 300);
			return () => clearTimeout(t);
		}
		if (open) {
			setTimeout(() => inputRef.current?.focus(), 100);
		}
	}, [open]);

	function addEmail() {
		const trimmed = emailInput.trim().replace(/,\s*$/, "");
		if (isValidEmail(trimmed) && !emails.includes(trimmed)) {
			setEmails((prev) => [...prev, trimmed]);
			setEmailInput("");
		}
	}

	function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
		if (e.key === "Enter" || e.key === "," || e.key === "Tab") {
			e.preventDefault();
			addEmail();
		} else if (
			e.key === "Backspace" &&
			emailInput === "" &&
			emails.length > 0
		) {
			setEmails((prev) => prev.slice(0, -1));
		}
	}

	function removeEmail(email: string) {
		setEmails((prev) => prev.filter((e) => e !== email));
	}

	function handleSend() {
		setSent(true);
		setTimeout(() => {
			onClose();
		}, 2000);
	}

	const canSend = emails.length > 0;

	if (!open) return null;

	return (
		<>
			<style>{`
				@keyframes inv-fade-in {
					from { opacity: 0; }
					to   { opacity: 1; }
				}
				@keyframes inv-slide-up {
					from { transform: translateY(100%); }
					to   { transform: translateY(0); }
				}
				@keyframes inv-pop-in {
					0%   { transform: scale(0.7); opacity: 0; }
					60%  { transform: scale(1.08); opacity: 1; }
					100% { transform: scale(1); }
				}
				@keyframes inv-check-draw {
					from { stroke-dashoffset: 30; }
					to   { stroke-dashoffset: 0; }
				}
				.inv-tag {
					animation: inv-pop-in 0.2s cubic-bezier(0.34, 1.56, 0.64, 1) both;
				}
			`}</style>

			{/* Backdrop */}
			<div
				className="fixed inset-0 z-40 bg-[#1C1A17]/25 backdrop-blur-[3px]"
				style={{ animation: "inv-fade-in 0.2s ease" }}
				onClick={onClose}
			/>

			{/* Sheet */}
			<div
				className="fixed bottom-0 left-0 right-0 z-50 bg-[#FAF7F2] rounded-t-[28px] shadow-[0_-12px_48px_rgba(28,26,23,0.18)]"
				style={{
					animation: "inv-slide-up 0.35s cubic-bezier(0.32, 0.72, 0, 1)",
					maxHeight: "92dvh",
					overflowY: "auto",
					WebkitOverflowScrolling: "touch",
				}}
			>
				{/* Drag handle */}
				<div className="flex justify-center pt-3 pb-1">
					<div className="w-9 h-[3px] bg-[#D9D1C7] rounded-full" />
				</div>

				{sent ? (
					/* ── Success state ─────────────────────────────── */
					<div
						className="px-6 pb-12 pt-6 text-center"
						style={{ animation: "inv-fade-in 0.3s ease" }}
					>
						<div className="w-16 h-16 mx-auto mb-5 rounded-full bg-[#F0EBE3] flex items-center justify-center">
							<svg width="26" height="26" viewBox="0 0 26 26" fill="none">
								<path
									d="M5 14l5 5 11-12"
									stroke="#C4714A"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeDasharray="30"
									style={{
										animation: "inv-check-draw 0.4s 0.1s ease both",
									}}
								/>
							</svg>
						</div>
						<h3
							className="text-2xl text-[#1C1A17] mb-2"
							style={{ fontFamily: "'Fraunces', serif", fontWeight: 300 }}
						>
							{emails.length === 1 ? "Invite sent" : `${emails.length} invites sent`}
						</h3>
						<p className="text-sm text-[#7A7268] leading-relaxed">
							{emails.length === 1
								? `${emails[0]} will receive a link to apply shortly.`
								: "Recipients will receive a link to apply shortly."}
						</p>
					</div>
				) : (
					/* ── Invite form ───────────────────────────────── */
					<div className="px-5 pb-8 pt-3">
						{/* Header */}
						<div className="flex items-start justify-between mb-6">
							<div>
								<p className="text-[10px] text-[#C4714A] tracking-widest uppercase font-medium mb-1.5">
									New invite
								</p>
								<h3
									className="text-[1.6rem] leading-tight text-[#1C1A17]"
									style={{ fontFamily: "'Fraunces', serif", fontWeight: 300 }}
								>
									Invite to Apply
								</h3>
							</div>
							<button
								type="button"
								onClick={onClose}
								className="mt-1.5 w-8 h-8 flex items-center justify-center rounded-full bg-[#EDE8E2] text-[#7A7268] hover:bg-[#E2DBD3] transition-colors"
								aria-label="Close"
							>
								<svg width="12" height="12" viewBox="0 0 12 12" fill="none">
									<path
										d="M1 1l10 10M11 1L1 11"
										stroke="currentColor"
										strokeWidth="1.5"
										strokeLinecap="round"
									/>
								</svg>
							</button>
						</div>

						{/* Email field */}
						<div className="mb-4">
							<label className="text-[10px] text-[#7A7268] tracking-widest uppercase block mb-2">
								Recipient emails
							</label>
							{/* biome-ignore lint/a11y/useKeyWithClickEvents: click activates input focus */}
							<div
								className="min-h-[54px] bg-white rounded-2xl border border-[#E8E1D9] px-3.5 py-2.5 flex flex-wrap gap-1.5 cursor-text focus-within:border-[#C4714A] transition-colors"
								onClick={() => inputRef.current?.focus()}
							>
								{emails.map((email) => (
									<span
										key={email}
										className="inv-tag inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full bg-[#F5E8DF] text-[#C4714A] text-xs font-medium"
									>
										{email}
										<button
											type="button"
											onClick={(e) => {
												e.stopPropagation();
												removeEmail(email);
											}}
											className="w-4 h-4 rounded-full flex items-center justify-center text-[#C4714A]/50 hover:text-[#C4714A] hover:bg-[#EDD9CC] transition-colors"
											aria-label={`Remove ${email}`}
										>
											<svg width="8" height="8" viewBox="0 0 8 8" fill="none">
												<path
													d="M1 1l6 6M7 1L1 7"
													stroke="currentColor"
													strokeWidth="1.4"
													strokeLinecap="round"
												/>
											</svg>
										</button>
									</span>
								))}
								<input
									ref={inputRef}
									type="email"
									value={emailInput}
									onChange={(e) => setEmailInput(e.target.value)}
									onKeyDown={handleKeyDown}
									onBlur={addEmail}
									placeholder={
										emails.length === 0
											? "name@email.com — press Enter to add"
											: "Add another..."
									}
									className="flex-1 min-w-[180px] outline-none text-sm text-[#1C1A17] placeholder:text-[#C0B8B0] bg-transparent py-1"
								/>
							</div>
							<p className="text-[10px] text-[#B8B0A7] mt-1.5 pl-0.5">
								Press Enter or comma to add multiple recipients
							</p>
						</div>

						{/* Property */}
						<div className="mb-4">
							<label className="text-[10px] text-[#7A7268] tracking-widest uppercase block mb-2">
								Property{" "}
								<span className="text-[#B8B0A7] normal-case tracking-normal">
									(optional)
								</span>
							</label>
							<input
								type="text"
								value={property}
								onChange={(e) => setProperty(e.target.value)}
								placeholder="e.g. 123 Oak Street, Unit 4B"
								className="w-full bg-white rounded-2xl border border-[#E8E1D9] px-3.5 py-3 text-sm text-[#1C1A17] placeholder:text-[#C0B8B0] outline-none focus:border-[#C4714A] transition-colors"
							/>
						</div>

						{/* Message */}
						<div className="mb-6">
							<label className="text-[10px] text-[#7A7268] tracking-widest uppercase block mb-2">
								Personal note{" "}
								<span className="text-[#B8B0A7] normal-case tracking-normal">
									(optional)
								</span>
							</label>
							<textarea
								value={message}
								onChange={(e) => setMessage(e.target.value)}
								placeholder="Hi! I'd love for you to apply for the apartment at…"
								rows={3}
								className="w-full bg-white rounded-2xl border border-[#E8E1D9] px-3.5 py-3 text-sm text-[#1C1A17] placeholder:text-[#C0B8B0] outline-none focus:border-[#C4714A] transition-colors resize-none leading-relaxed"
							/>
						</div>

						{/* Preview pill */}
						{(emails.length > 0 || property) && (
							<div
								className="mb-4 px-4 py-3 rounded-2xl bg-[#F0EBE3] flex items-start gap-3"
								style={{ animation: "inv-fade-in 0.2s ease" }}
							>
								<svg
									className="mt-0.5 shrink-0"
									width="14"
									height="14"
									viewBox="0 0 14 14"
									fill="none"
								>
									<path
										d="M1 3a1 1 0 011-1h10a1 1 0 011 1v8a1 1 0 01-1 1H2a1 1 0 01-1-1V3z"
										stroke="#C4714A"
										strokeWidth="1.1"
									/>
									<path
										d="M1 4l6 4.5L13 4"
										stroke="#C4714A"
										strokeWidth="1.1"
										strokeLinecap="round"
									/>
								</svg>
								<p className="text-xs text-[#7A7268] leading-relaxed">
									{emails.length > 0 && (
										<>
											<span className="text-[#1C1A17] font-medium">
												{emails.length === 1
													? emails[0]
													: `${emails.length} recipients`}
											</span>{" "}
											will receive an application link
										</>
									)}
									{property && (
										<>
											{emails.length > 0 ? " " : "Application link "}
											for{" "}
											<span className="text-[#1C1A17] font-medium">{property}</span>
										</>
									)}
									.
								</p>
							</div>
						)}

						{/* Send CTA */}
						<button
							type="button"
							onClick={handleSend}
							disabled={!canSend}
							className={[
								"w-full py-3.5 rounded-2xl text-sm font-medium transition-all duration-150",
								canSend
									? "bg-[#1C1A17] text-[#F5F0E8] hover:bg-[#2E2B27] active:scale-[0.98] shadow-[0_2px_12px_rgba(28,26,23,0.25)]"
									: "bg-[#E8E1D9] text-[#B8B0A7] cursor-not-allowed",
							].join(" ")}
						>
							{canSend
								? `Send Invite${emails.length > 1 ? `s (${emails.length})` : ""}`
								: "Add at least one email to continue"}
						</button>
					</div>
				)}
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
							<svg width="10" height="10" viewBox="0 0 10 10" fill="none">
								<path
									d="M5 1v8M1 5h8"
									stroke="currentColor"
									strokeWidth="1.5"
									strokeLinecap="round"
								/>
							</svg>
							Invite
						</button>
						<span className="text-[10px] text-[#7A7268] tracking-widest uppercase">
							Landlord
						</span>
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
							<svg width="13" height="13" viewBox="0 0 13 13" fill="none">
								<path
									d="M1 2.5a1 1 0 011-1h9a1 1 0 011 1v6a1 1 0 01-1 1H8L6.5 11 5 9.5H2a1 1 0 01-1-1v-6z"
									stroke="currentColor"
									strokeWidth="1.2"
									strokeLinejoin="round"
								/>
								<path
									d="M4 5.5h5M4 7.5h3"
									stroke="currentColor"
									strokeWidth="1.2"
									strokeLinecap="round"
								/>
							</svg>
							Send your first invite
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

			<InviteSheet open={inviteOpen} onClose={() => setInviteOpen(false)} />
		</div>
	);
}
