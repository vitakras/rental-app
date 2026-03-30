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

// Routes that must exist to serve local uploads:
//   PUT  /storage/*  — reads raw body, writes to data/uploads/<key>
//   GET  /storage/*  — reads data/uploads/<key>, streams it back

export function createLocalBlobStorage(): BlobStorage {
	return {
		async createUploadUrl({ key }) {
			await fs.mkdir(path.join(UPLOADS_DIR, path.dirname(key)), {
				recursive: true,
			});
			return {
				uploadUrl: `${getApiBaseUrl()}/storage/${encodeStorageKeyForPath(key)}`,
			};
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
