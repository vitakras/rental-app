import { index, prefix, type RouteConfig, route } from "@react-router/dev/routes";

export default [
	index("routes/home.tsx"),
	route("apply", "routes/application-flow/apply.tsx"),
	route("applications/:id", "routes/application-flow/application.tsx"),
	route("applications/:id/occupants", "routes/application-flow/application-occupants.tsx"),
	route("applications/:id/income", "routes/application-flow/application-income.tsx"),
	route("applications/:id/documents", "routes/application-flow/application-documents.tsx"),
	route("api/storage/*", "routes/api-storage.ts"),
	...prefix("l", [
		route("applications", "routes/landlord/applications.tsx"),
		route("applications/:id", "routes/landlord/application.tsx"),
	]),
] satisfies RouteConfig;
