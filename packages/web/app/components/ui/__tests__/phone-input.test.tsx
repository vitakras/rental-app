import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, test } from "vitest";
import { PhoneInput } from "../phone-input";

afterEach(cleanup);

function Controlled({
	name,
	initialValue = "",
}: {
	name?: string;
	initialValue?: string;
}) {
	const [value, setValue] = useState(initialValue);
	return (
		<form>
			<PhoneInput
				data-testid="phone"
				name={name}
				value={value}
				onChange={(e) => setValue(e.target.value)}
			/>
		</form>
	);
}

function hiddenInput(name: string) {
	return document.querySelector<HTMLInputElement>(
		`input[type="hidden"][name="${name}"]`,
	);
}

describe("PhoneInput — visual display", () => {
	test("formats a full 10-digit number", async () => {
		render(<Controlled name="phone" />);
		await userEvent.type(screen.getByTestId("phone"), "4162232342");
		expect((screen.getByTestId("phone") as HTMLInputElement).value).toBe(
			"(416) 223-2342",
		);
	});

	test("formats partial input — area code only", async () => {
		render(<Controlled name="phone" />);
		await userEvent.type(screen.getByTestId("phone"), "416");
		expect((screen.getByTestId("phone") as HTMLInputElement).value).toBe(
			"(416",
		);
	});

	test("formats partial input — area code + 3 digits", async () => {
		render(<Controlled name="phone" />);
		await userEvent.type(screen.getByTestId("phone"), "416223");
		expect((screen.getByTestId("phone") as HTMLInputElement).value).toBe(
			"(416) 223",
		);
	});

	test("ignores non-digit characters typed", async () => {
		render(<Controlled name="phone" />);
		await userEvent.type(screen.getByTestId("phone"), "abc4162232342");
		expect((screen.getByTestId("phone") as HTMLInputElement).value).toBe(
			"(416) 223-2342",
		);
	});

	test("caps at 10 digits", async () => {
		render(<Controlled name="phone" />);
		await userEvent.type(screen.getByTestId("phone"), "41622323421234");
		expect((screen.getByTestId("phone") as HTMLInputElement).value).toBe(
			"(416) 223-2342",
		);
	});

	test("pre-populated formatted value is displayed correctly", () => {
		render(<Controlled name="phone" initialValue="(416) 223-2342" />);
		expect((screen.getByTestId("phone") as HTMLInputElement).value).toBe(
			"(416) 223-2342",
		);
	});
});

describe("PhoneInput — form (hidden input) value", () => {
	test("hidden input contains raw digits for a full number", async () => {
		render(<Controlled name="phone" />);
		await userEvent.type(screen.getByTestId("phone"), "4162232342");
		expect(hiddenInput("phone")?.value).toBe("4162232342");
	});

	test("hidden input updates as digits are typed", async () => {
		render(<Controlled name="phone" />);
		await userEvent.type(screen.getByTestId("phone"), "416");
		expect(hiddenInput("phone")?.value).toBe("416");
	});

	test("hidden input strips formatting chars from pre-populated value", () => {
		render(<Controlled name="phone" initialValue="(416) 223-2342" />);
		expect(hiddenInput("phone")?.value).toBe("4162232342");
	});

	test("no hidden input rendered when name prop is omitted", () => {
		render(<Controlled />);
		expect(document.querySelector('input[type="hidden"]')).toBeNull();
	});
});
