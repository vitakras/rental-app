import { redirect } from "react-router";
import { getServerApiBaseUrl } from "~/lib/api-base-url";

export async function requireLandlordSession(request: Request) {
	const cookie = request.headers.get("cookie");
	const response = await fetch(`${getServerApiBaseUrl()}/auth/email/session`, {
		headers: cookie ? { cookie } : undefined,
	});

	if (response.status === 401) {
		throw redirect("/login?role=landlord");
	}

	if (!response.ok) {
		throw new Response(null, { status: response.status });
	}

	const result = (await response.json()) as {
		user: {
			globalRole: string;
		};
	};

	if (result.user.globalRole !== "landlord") {
		throw redirect("/login?role=landlord");
	}

	return result.user;
}
