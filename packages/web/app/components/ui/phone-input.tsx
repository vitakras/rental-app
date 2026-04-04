import type * as React from "react";
import { Input } from "~/components/ui/input";

function formatPhoneNumber(raw: string): string {
	const digits = raw.replace(/\D/g, "").slice(0, 10);
	if (digits.length === 0) return "";
	if (digits.length <= 3) return `(${digits}`;
	if (digits.length <= 6)
		return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
	return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function PhoneInput({
	onChange,
	value,
	name,
	...props
}: React.ComponentProps<typeof Input>) {
	const digits = String(value ?? "").replace(/\D/g, "");

	function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
		const formatted = formatPhoneNumber(e.target.value);
		onChange?.({
			...e,
			target: { ...e.target, value: formatted },
		} as React.ChangeEvent<HTMLInputElement>);
	}

	return (
		<>
			{name && <input type="hidden" name={name} value={digits} />}
			<Input
				type="tel"
				inputMode="numeric"
				autoComplete="tel"
				value={value}
				onChange={handleChange}
				{...props}
			/>
		</>
	);
}

export { PhoneInput };
