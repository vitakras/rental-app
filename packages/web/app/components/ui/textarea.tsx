import type * as React from "react";

import { cn } from "~/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
	return (
		<textarea
			data-slot="textarea"
			className={cn(
				"flex w-full rounded-xl border-2 border-[#E8E1D9] bg-[#FAFAF9] px-4 py-3 text-sm text-[#1C1A17] placeholder:text-[#C0B8AF] transition-colors resize-none focus-visible:outline-none focus-visible:border-[#C4714A] disabled:cursor-not-allowed disabled:opacity-50",
				className,
			)}
			{...props}
		/>
	);
}

export { Textarea };
