import fs from "node:fs/promises";
import path from "node:path";
import type { BlobStorage } from "./blob.storage";

const UPLOADS_DIR = path.resolve("data/uploads");

// Routes that must exist to serve local uploads:
//   PUT  /api/storage/:key  — reads raw body, writes to data/uploads/<key>
//   GET  /api/storage/:key  — reads data/uploads/<key>, streams it back

export function createLocalBlobStorage(
  baseUrl = "http://localhost:5173"
): BlobStorage {
  return {
    async createUploadUrl({ key }) {
      await fs.mkdir(path.join(UPLOADS_DIR, path.dirname(key)), {
        recursive: true,
      });
      return { uploadUrl: `${baseUrl}/api/storage/${encodeURIComponent(key)}` };
    },

    async createDownloadUrl(key) {
      const filePath = path.join(UPLOADS_DIR, key);
      await fs.access(filePath);
      return {
        downloadUrl: `${baseUrl}/api/storage/${encodeURIComponent(key)}`,
      };
    },

    async deleteObject(key) {
      const filePath = path.join(UPLOADS_DIR, key);
      await fs.rm(filePath, { force: true });
    },
  };
}
