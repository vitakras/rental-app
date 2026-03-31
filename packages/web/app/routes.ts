import {
	index,
	layout,
	type RouteConfig,
	route,
} from "@react-router/dev/routes";

export default [
	index("routes/home.tsx"),
	route("login", "routes/auth/login.tsx"),
	route("login/verify", "routes/auth/verify.tsx"),
	route("login/check-email", "routes/auth/check-email.tsx"),
	route("signout", "routes/auth/signout.tsx"),
	route("a", "routes/applicants/layout.tsx", [
		route("apply", "routes/applicants/apply.tsx"),
		route("applications/:id", "routes/applicants/application-shell.tsx", [
			index("routes/applicants/application.tsx"),
			route("occupants", "routes/applicants/application-occupants.tsx"),
			route("income", "routes/applicants/application-income.tsx"),
			route("documents", "routes/applicants/application-documents.tsx"),
		]),
	]),
	route("l", "routes/landlord/layout.tsx", [
		route("applications", "routes/landlord/applications.tsx"),
		route("applications/:id", "routes/landlord/application.tsx"),
	]),
] satisfies RouteConfig;
