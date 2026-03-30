import {
	index,
	layout,
	type RouteConfig,
	route,
} from "@react-router/dev/routes";

export default [
	index("routes/home.tsx"),
	layout("routes/application-flow/layout.tsx", [
		route("apply", "routes/application-flow/apply.tsx"),
		route("applications/:id", "routes/application-flow/application-shell.tsx", [
			index("routes/application-flow/application.tsx"),
			route("occupants", "routes/application-flow/application-occupants.tsx"),
			route("income", "routes/application-flow/application-income.tsx"),
			route("documents", "routes/application-flow/application-documents.tsx"),
		]),
	]),
	route("api/applications/:id/upload/prepare", "routes/api-upload-prepare.ts"),
	route(
		"api/applications/:id/upload/complete",
		"routes/api-upload-complete.ts",
	),
	route("l", "routes/landlord/layout.tsx", [
		route("applications", "routes/landlord/applications.tsx"),
		route("applications/:id", "routes/landlord/application.tsx"),
	]),
] satisfies RouteConfig;
