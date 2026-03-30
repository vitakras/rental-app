import { data, Form, useNavigation } from "react-router";
import { apiClient } from "~/lib/api";
import type { Route } from "./+types/application";

export async function loader({ params }: Route.LoaderArgs) {
	const id = Number(params.id);
	if (!Number.isInteger(id) || id <= 0) {
		throw data(null, { status: 404 });
	}
	const response = await apiClient.applications[":id"].$get({
		param: { id: String(id) },
	});

	if (response.status === 404) {
		throw data(null, { status: 404 });
	}

	if (!response.ok) {
		throw data(null, { status: response.status });
	}

	const { application } = (await response.json()) as {
		application: { status: string };
	};
	return { applicationId: id, status: application.status };
}

export async function action({ params }: Route.ActionArgs) {
	const id = Number(params.id);
	if (!Number.isInteger(id) || id <= 0) {
		throw data(null, { status: 404 });
	}
	const response = await apiClient.applications[":id"].submit.$post({
		param: { id: String(id) },
	});

	if (response.status === 404) throw data(null, { status: 404 });
	if (response.status === 409) throw data(null, { status: 409 });
	if (!response.ok) {
		throw data(null, { status: response.status });
	}

	return null;
}

export function meta() {
	return [{ title: "Application — Find Your Home" }];
}

export default function Application({ loaderData }: Route.ComponentProps) {
	const { applicationId, status } = loaderData;
	const navigation = useNavigation();
	const submitting = navigation.state === "submitting";

	return (
		<div className="min-h-screen bg-[#F5F0E8] flex items-center justify-center px-5">
			<div className="max-w-lg w-full bg-white rounded-2xl p-8 shadow-[0_1px_4px_rgba(28,26,23,0.07)] text-center">
				<p className="text-xs text-[#C4714A] tracking-widest uppercase font-medium mb-3">
					Application #{applicationId}
				</p>
				<h1
					className="text-3xl text-[#1C1A17] mb-3"
					style={{ fontFamily: "'Fraunces', serif", fontWeight: 300 }}
				>
					Application received
				</h1>
				<p className="text-sm text-[#7A7268] mb-6">Status: {status}</p>
				{status === "pending" && (
					<Form method="post">
						<button
							type="submit"
							disabled={submitting}
							className="bg-[#C4714A] text-white text-sm font-medium px-6 py-2.5 rounded-lg hover:bg-[#b5603a] disabled:opacity-50 transition-colors"
						>
							{submitting ? "Submitting…" : "Submit Application"}
						</button>
					</Form>
				)}
			</div>
		</div>
	);
}
