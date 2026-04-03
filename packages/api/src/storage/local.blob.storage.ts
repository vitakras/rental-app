import fs from "node:fs/promises";
import path from "node:path";
import { getApiBaseUrl } from "~/config";
import type { BlobStorage } from "./blob.storage";

const UPLOADS_DIR = path.resolve("data/uploads");

function encodeStorageKeyForPath(key: string) {
	return key
		.split("/")
		.map((segment) => encodeURIComponent(segment))
		.join("/");
}

// Route that must exist to serve local uploads:
//   GET /storage/* — reads data/uploads/<key>, streams it back

export function createLocalBlobStorage(): BlobStorage {
	return {
		async putObject({ key, body }) {
			const filePath = path.join(UPLOADS_DIR, key);
			await fs.mkdir(path.dirname(filePath), { recursive: true });
			await fs.writeFile(filePath, Buffer.from(body));
		},

		async createDownloadUrl(key) {
			const filePath = path.join(UPLOADS_DIR, key);
			await fs.access(filePath);
			return {
				downloadUrl: `${getApiBaseUrl()}/storage/${encodeStorageKeyForPath(key)}`,
			};
		},

		async objectExists(key) {
			const filePath = path.join(UPLOADS_DIR, key);

			try {
				await fs.access(filePath);
				return true;
			} catch {
				return false;
			}
		},

		async deleteObject(key) {
			const filePath = path.join(UPLOADS_DIR, key);
			await fs.rm(filePath, { force: true });
		},
	};
}
