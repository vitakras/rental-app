import fs from "node:fs/promises";
import path from "node:path";
import type { BlobStorage } from "./blob.storage";

const UPLOADS_DIR = path.resolve("data/uploads");

// Routes that must exist to serve local uploads:
//   PUT  /api/storage/*  — reads raw body, writes to data/uploads/<key>
//   GET  /api/storage/*  — reads data/uploads/<key>, streams it back

export function createLocalBlobStorage(): BlobStorage {
	return {
		async createUploadUrl({ key }) {
			await fs.mkdir(path.join(UPLOADS_DIR, path.dirname(key)), {
				recursive: true,
			});
			return { uploadUrl: `/api/storage/${encodeURIComponent(key)}` };
		},

		async createDownloadUrl(key) {
			const filePath = path.join(UPLOADS_DIR, key);
			await fs.access(filePath);
			return {
				downloadUrl: `/api/storage/${encodeURIComponent(key)}`,
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
