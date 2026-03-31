import { redirect } from "react-router";
import { apiClient } from "~/lib/api";

export async function clientAction() {
	await apiClient.auth.email.signout.$post();
	return redirect("/login");
}
