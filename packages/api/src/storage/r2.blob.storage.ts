import { getApiBaseUrl } from "~/config";
import type { BlobStorage } from "./blob.storage";

function encodeStorageKeyForPath(key: string) {
	return key
		.split("/")
		.map((segment) => encodeURIComponent(segment))
		.join("/");
}

export function createR2BlobStorage(bucket: R2Bucket): BlobStorage {
	return {
		async putObject({ key, contentType, body }) {
			await bucket.put(key, body, {
				httpMetadata: { contentType },
			});
		},

		async createDownloadUrl(key) {
			const object = await bucket.head(key);

			if (!object) {
				throw new Error(`Object not found for key: ${key}`);
			}

			return {
				downloadUrl: `${getApiBaseUrl()}/storage/${encodeStorageKeyForPath(key)}`,
			};
		},

		async getObject(key) {
			const object = await bucket.get(key);
			if (!object) return null;
			return {
				body: object.body,
				contentType:
					object.httpMetadata?.contentType ?? "application/octet-stream",
			};
		},

		async objectExists(key) {
			return (await bucket.head(key)) !== null;
		},

		async deleteObject(key) {
			await bucket.delete(key);
		},
	};
}
