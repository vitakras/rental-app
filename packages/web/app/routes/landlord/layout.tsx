import { Outlet, redirect } from "react-router";
import { apiClient } from "~/lib/api";
import type { Route } from "./+types/layout";

export async function clientLoader(_: Route.ClientLoaderArgs) {
	const response = await apiClient.auth.email.session.$get();

	if (response.status === 401) {
		throw redirect("/login?role=landlord");
	}

	const result = (await response.json()) as {
		user: {
			globalRole: string;
		};
	};

	if (result.user.globalRole !== "landlord") {
		throw redirect("/login?role=landlord");
	}

	return null;
}

export function links() {
	return [
		{ rel: "preconnect", href: "https://fonts.googleapis.com" },
		{
			rel: "preconnect",
			href: "https://fonts.gstatic.com",
			crossOrigin: "anonymous" as const,
		},
		{
			rel: "stylesheet",
			href: "https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;1,9..144,300;1,9..144,400&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap",
		},
	];
}

export default function LandlordLayout() {
	return <Outlet />;
}
