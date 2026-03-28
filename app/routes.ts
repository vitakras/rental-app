import { index, type RouteConfig, route } from "@react-router/dev/routes";

export default [
	index("routes/home.tsx"),
	route("apply", "routes/apply.tsx"),
	route("applications/:id", "routes/application.tsx"),
] satisfies RouteConfig;
