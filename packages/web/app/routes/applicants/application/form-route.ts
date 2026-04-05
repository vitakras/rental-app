import type { ApplicationWithDetails } from "api";
import { data, redirect } from "react-router";
import { apiClient } from "~/lib/api";

export function parseApplicationParam(idParam: string | undefined) {
	const id = Number(idParam);

	if (!Number.isInteger(id) || id <= 0) {
		throw data(null, { status: 404 });
	}

	return id;
}

export function isApplicationEditable(status: string) {
	return status === "draft" || status === "pending" || status === "info_requested";
}

export async function loadEditableApplication(id: number) {
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
		application: ApplicationWithDetails;
	};

	if (!isApplicationEditable(application.status)) {
		throw redirect(`/a/applications/${id}`);
	}

	return application;
}
