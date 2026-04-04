import { BASE_API_URL } from "~/config/env";

export async function deleteApplicationFile(
	applicationId: number,
	fileId: string,
): Promise<void> {
	const res = await fetch(
		`${BASE_API_URL}/applications/${applicationId}/documents/${fileId}`,
		{
			method: "DELETE",
			credentials: "include",
		},
	);

	if (!res.ok) {
		throw new Error("Failed to delete file");
	}
}
