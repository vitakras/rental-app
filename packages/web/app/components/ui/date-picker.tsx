"use client";

import * as React from "react";

import { Button } from "~/components/ui/button";
import { Calendar } from "~/components/ui/calendar";
import { Label } from "~/components/ui/label";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "~/components/ui/popover";
import { cn } from "~/lib/utils";

function parseDateValue(value: string) {
	if (!value) return undefined;

	const [year, month, day] = value.split("-").map(Number);
	if (!year || !month || !day) return undefined;

	return new Date(year, month - 1, day);
}

function formatDateValue(date: Date | undefined) {
	if (!date) return "";

	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");

	return `${year}-${month}-${day}`;
}

function formatDisplayDate(date: Date | undefined) {
	if (!date) return "";

	return date.toLocaleDateString(undefined, {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
}

type DatePickerProps = {
	id?: string;
	label: string;
	value: string;
	onChange: (value: string) => void;
	hint?: string;
	placeholder?: string;
	disabled?: boolean;
	className?: string;
	buttonClassName?: string;
	startMonth?: Date;
	endMonth?: Date;
};

function DatePicker({
	id,
	label,
	value,
	onChange,
	hint,
	placeholder = "Select date",
	disabled = false,
	className,
	buttonClassName,
	startMonth = new Date(1900, 0),
	endMonth = new Date(new Date().getFullYear() + 10, 11),
}: DatePickerProps) {
	const generatedId = React.useId();
	const fieldId = id ?? generatedId;
	const [open, setOpen] = React.useState(false);
	const selectedDate = parseDateValue(value);

	return (
		<div className={className}>
			<Label htmlFor={fieldId} className="mb-1.5 block">
				{label}
			</Label>
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger asChild>
					<Button
						type="button"
						variant="outline"
						id={fieldId}
						disabled={disabled}
						className={cn(
							"h-10 w-full justify-start px-3 text-left font-normal",
							!selectedDate && "text-[#7A7268]",
							buttonClassName,
						)}
					>
						{selectedDate ? formatDisplayDate(selectedDate) : placeholder}
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-auto overflow-hidden p-0" align="start">
					<Calendar
						mode="single"
						selected={selectedDate}
						defaultMonth={selectedDate}
						captionLayout="dropdown"
						startMonth={startMonth}
						endMonth={endMonth}
						onSelect={(date) => {
							onChange(formatDateValue(date));
							setOpen(false);
						}}
					/>
				</PopoverContent>
			</Popover>
			{hint && (
				<p className="mt-1.5 text-xs leading-relaxed text-[#7A7268]">{hint}</p>
			)}
		</div>
	);
}

export { DatePicker };
