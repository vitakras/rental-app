import { useState } from "react";
import { Link } from "react-router";
import { Button } from "~/components/ui/button";
import {
	InputOTP,
	InputOTPGroup,
	InputOTPSlot,
} from "~/components/ui/input-otp";

export function meta() {
	return [{ title: "Enter access code — Rental Portal" }];
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

export default function OtpVerify() {
	const [value, setValue] = useState("");
	const [showForgotInfo, setShowForgotInfo] = useState(false);

	const isComplete = value.length === 6;

	return (
		<div
			className="min-h-screen bg-[#F5F0E8]"
			style={{ fontFamily: "'DM Sans', sans-serif" }}
		>
			{/* Back link */}
			<div className="px-5 py-5">
				<Link
					to="/login"
					className="inline-flex items-center gap-1.5 text-sm text-[#7A7268] hover:text-[#1C1A17] transition-colors"
				>
					<BackArrow />
					Back
				</Link>
			</div>

			<div className="max-w-md mx-auto px-5 pt-6 pb-16">
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
						<rect x="3" y="11" width="18" height="11" rx="2" />
						<path d="M7 11V7a5 5 0 0 1 10 0v4" />
					</svg>
				</div>

				{/* Heading */}
				<div className="mb-10">
					<p className="text-xs text-[#C4714A] font-medium tracking-widest uppercase mb-3">
						Applicant Portal
					</p>
					<h1
						className="text-[2.8rem] leading-[1.1] text-[#1C1A17] mb-3"
						style={{ fontFamily: "'Fraunces', serif", fontWeight: 300 }}
					>
						Enter your
						<br />
						<em>access code.</em>
					</h1>
					<p className="text-[#7A7268] text-sm leading-relaxed">
						Enter the 6-digit code provided by the property you're applying to.
					</p>
				</div>

				{/* OTP Card */}
				<div className="bg-white rounded-2xl p-6 shadow-[0_1px_4px_rgba(28,26,23,0.07)] mb-4">
					<p className="text-xs font-medium text-[#7A7268] uppercase tracking-widest mb-5">
						Access Code
					</p>

					<div className="flex justify-center">
						<InputOTP
							maxLength={6}
							value={value}
							onChange={setValue}
							autoFocus
						>
							<InputOTPGroup>
								{[0, 1, 2, 3, 4, 5].map((i) => (
									<InputOTPSlot
										key={i}
										index={i}
										className="size-12 text-base font-medium text-[#1C1A17] border-[#E8E1D9] first:rounded-l-xl last:rounded-r-xl data-[active=true]:border-[#C4714A] data-[active=true]:ring-[#C4714A]/20"
									/>
								))}
							</InputOTPGroup>
						</InputOTP>
					</div>
				</div>

				<Button variant="continue" disabled={!isComplete}>
					Continue
				</Button>

				{/* Forgot code */}
				<div className="mt-8">
					<div className="flex items-center gap-3 mb-4">
						<div className="flex-1 h-px bg-[#E8E1D9]" />
						<span className="text-xs text-[#7A7268]">need help?</span>
						<div className="flex-1 h-px bg-[#E8E1D9]" />
					</div>

					<button
						type="button"
						onClick={() => setShowForgotInfo((v) => !v)}
						className="w-full text-left"
					>
						<div className="flex items-center justify-between">
							<span className="text-sm text-[#7A7268] hover:text-[#1C1A17] transition-colors">
								I don't have a code
							</span>
							<svg
								width="16"
								height="16"
								viewBox="0 0 16 16"
								fill="none"
								stroke="#7A7268"
								strokeWidth="1.5"
								strokeLinecap="round"
								strokeLinejoin="round"
								aria-hidden="true"
								style={{
									transform: showForgotInfo ? "rotate(180deg)" : "rotate(0deg)",
									transition: "transform 200ms ease",
								}}
							>
								<path d="M4 6l4 4 4-4" />
							</svg>
						</div>
					</button>

					{showForgotInfo && (
						<div className="mt-3 bg-white rounded-xl p-4 shadow-[0_1px_4px_rgba(28,26,23,0.07)]">
							<div className="flex gap-3">
								<div className="mt-0.5 w-8 h-8 rounded-lg bg-[#FDF3EC] flex-shrink-0 flex items-center justify-center">
									<svg
										width="16"
										height="16"
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
								<div>
									<p className="text-sm font-medium text-[#1C1A17] mb-1">
										Contact the property
									</p>
									<p className="text-sm text-[#7A7268] leading-relaxed">
										Your access code is issued by the property you're applying
										to. Reach out to them directly and ask them to share your
										application code.
									</p>
								</div>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
