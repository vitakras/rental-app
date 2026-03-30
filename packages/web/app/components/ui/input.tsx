import type * as React from "react";

import { cn } from "~/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
	return (
		<input
			type={type}
			data-slot="input"
			className={cn(
				"flex w-full rounded-xl border-2 border-[#E8E1D9] bg-[#FAFAF9] px-4 py-3 text-sm text-[#1C1A17] placeholder:text-[#C0B8AF] transition-colors focus-visible:outline-none focus-visible:border-[#C4714A] disabled:cursor-not-allowed disabled:opacity-50 file:border-0 file:bg-transparent file:text-sm file:font-medium",
				className,
			)}
			{...props}
		/>
	);
}

export { Input };
