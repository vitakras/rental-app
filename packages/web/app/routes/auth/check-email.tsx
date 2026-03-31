import type React from "react";
import { Link, useSearchParams } from "react-router";

export function meta() {
	return [{ title: "Check your email — Rental Portal" }];
}

const EMAIL_PROVIDERS: {
	name: string;
	href: string;
	bg: string;
	domains: string[];
	icon: React.ReactNode;
}[] = [
	{
		name: "Gmail",
		href: "https://mail.google.com/mail/u/0/",
		bg: "#EA4335",
		domains: ["gmail.com", "googlemail.com"],
		icon: (
			<svg
				width="20"
				height="20"
				viewBox="0 0 24 24"
				fill="currentColor"
				aria-hidden="true"
			>
				<path
					d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"
					fill="white"
				/>
			</svg>
		),
	},
	{
		name: "Outlook",
		href: "https://outlook.live.com/mail/inbox",
		bg: "#0078D4",
		domains: ["outlook.com", "hotmail.com", "hotmail.co.uk", "live.com", "msn.com"],
		icon: (
			<svg
				width="20"
				height="20"
				viewBox="0 0 24 24"
				fill="currentColor"
				aria-hidden="true"
			>
				<path
					d="M7.88 12.04q0 .45-.11.87-.1.41-.33.74-.22.33-.58.52-.37.2-.87.2t-.85-.2q-.35-.21-.57-.55-.22-.33-.33-.75-.1-.42-.1-.86t.1-.87q.1-.43.34-.76.22-.34.59-.54.36-.2.87-.2t.86.2q.35.21.57.55.22.34.31.77.1.43.1.88zM24 12v9.38q0 .46-.33.8-.33.32-.8.32H7.13q-.46 0-.8-.33-.32-.33-.32-.8V18H1q-.41 0-.7-.3-.3-.29-.3-.7V7q0-.41.3-.7Q.58 6 1 6h6.1V2.55q0-.44.3-.75.3-.3.75-.3h12.5q.44 0 .75.3.3.3.3.75V10.85l1.24.72h.01q.1.07.18.18.07.12.07.25zm-6-8.25v3h3l-3-3zm4.5 10.96l-3.75-2.17v4.83h.7q.15 0 .28-.06.12-.07.21-.19zm-6.75 3.65V3.75h-10.5v.75H12q.65 0 1.07.43.42.43.43 1.07v5H10.9q-.2.35-.31.77-.12.43-.12.88 0 .56.16 1.03.15.48.43.84.28.37.67.58.4.2.88.2.48 0 .87-.19.4-.2.67-.56.28-.37.43-.84.16-.47.16-1.03 0-.43-.1-.87-.1-.44-.32-.77H14V9h3.75v8.41l-2.96 1.71q.1.17.25.29.17.12.37.12H18v.04h.75v-4.96L22.5 16.5V17l-3.75 2.17v.83h2.45q.43 0 .74-.3.3-.3.3-.73V14.71z"
					fill="white"
				/>
			</svg>
		),
	},
	{
		name: "Yahoo",
		href: "https://mail.yahoo.com/",
		bg: "#6001D2",
		domains: ["yahoo.com", "yahoo.co.uk", "yahoo.ca", "yahoo.com.au", "ymail.com"],
		icon: (
			<svg
				width="20"
				height="20"
				viewBox="0 0 24 24"
				fill="currentColor"
				aria-hidden="true"
			>
				<path
					d="M0 0l6.244 6.716V12h3.512V6.716L16 0H0zm8.483 13.696L5.52 18.6V24h3.348v-5.4l2.964-4.904H8.483z"
					fill="white"
				/>
			</svg>
		),
	},
];

function EnvelopeIcon() {
	return (
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
			<rect x="2" y="4" width="20" height="16" rx="2" />
			<path d="m2 7 8.586 5.586a2 2 0 0 0 2.828 0L22 7" />
		</svg>
	);
}

function getProvider(email: string) {
	const domain = email.split("@")[1]?.toLowerCase() ?? "";
	return EMAIL_PROVIDERS.find((p) => p.domains.includes(domain)) ?? null;
}

export default function CheckEmail() {
	const [searchParams] = useSearchParams();
	const email = searchParams.get("email") ?? "";
	const role = searchParams.get("role") ?? "applicant";
	const provider = getProvider(email);

	return (
		<div
			className="min-h-screen bg-[#F5F0E8] flex flex-col"
			style={{ fontFamily: "'DM Sans', sans-serif" }}
		>
			<div className="flex-1 flex flex-col justify-center items-center px-5 py-12">
				<div className="w-full max-w-sm">
					{/* Icon */}
					<div className="w-14 h-14 bg-[#C4714A]/10 rounded-2xl flex items-center justify-center mb-8">
						<EnvelopeIcon />
					</div>

					{/* Heading */}
					<p className="text-xs text-[#C4714A] font-medium tracking-widest uppercase mb-3">
						Sign-in link sent
					</p>
					<h1
						className="text-[2.8rem] leading-[1.1] text-[#1C1A17] mb-4"
						style={{ fontFamily: "'Fraunces', serif", fontWeight: 300 }}
					>
						Check your
						<br />
						<em>inbox.</em>
					</h1>

					{/* Body */}
					<p className="text-[#7A7268] text-sm leading-relaxed mb-1.5">
						If an account exists for{" "}
						{email ? (
							<span className="text-[#1C1A17] font-medium">{email}</span>
						) : (
							"that email address"
						)}
						, you'll receive a sign-in link shortly.
					</p>
					<p className="text-[#7A7268] text-sm mb-10">
						Don't see it? Check your spam folder.
					</p>

					{/* Email provider shortcut */}
					{provider ? (
						<div className="mb-10">
							<p className="text-xs text-[#B8B0A6] uppercase tracking-widest font-medium mb-3">
								Open your email app
							</p>
							<a
								href={provider.href}
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex items-center gap-3 bg-white rounded-2xl px-5 py-4 border border-[#E8E1D9] hover:border-[#C4714A] transition-colors group"
							>
								<div
									className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
									style={{ background: provider.bg }}
								>
									{provider.icon}
								</div>
								<span className="text-sm text-[#1C1A17] font-medium">
									Open {provider.name}
								</span>
								<svg
									width="16"
									height="16"
									viewBox="0 0 16 16"
									fill="none"
									stroke="#C4714A"
									strokeWidth="1.5"
									strokeLinecap="round"
									strokeLinejoin="round"
									className="ml-1 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all"
									aria-hidden="true"
								>
									<path d="M3.75 8h8.5M8.25 4.5 11.75 8l-3.5 3.5" />
								</svg>
							</a>
						</div>
					) : (
						<p className="text-[#7A7268] text-sm mb-10">
							Open your email app to find the sign-in link.
						</p>
					)}

					{/* Back link */}
					<Link
						to={`/login?role=${role}`}
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
						Try a different email
					</Link>
				</div>
			</div>
		</div>
	);
}
