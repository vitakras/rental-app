import { index, prefix, type RouteConfig, route } from "@react-router/dev/routes";

export default [
	index("routes/home.tsx"),
	route("apply", "routes/apply.tsx"),
	route("applications/:id", "routes/application.tsx"),
	route("applications/:id/income", "routes/application-income.tsx"),
	...prefix("l", [
		route("applications", "routes/landlord/applications.tsx"),
		route("applications/:id", "routes/landlord/application.tsx"),
	]),
] satisfies RouteConfig;
