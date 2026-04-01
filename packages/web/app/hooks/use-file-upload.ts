import type { ApplicationDocumentCategory, ApplicationDocumentType } from "api";
import { useState } from "react";
import { uploadApplicationFile } from "~/.client/upload-application-file";

export interface UploadedFile {
	clientId: string;
	filename: string;
	status: "uploading" | "done" | "error";
	fileId?: string;
}

interface SlotInfo {
	residentId: number;
	category: ApplicationDocumentCategory;
	documentType: ApplicationDocumentType;
}

export function useFileUpload(applicationId: number, slot: SlotInfo) {
	const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

	function uploadFiles(files: FileList) {
		for (const file of Array.from(files)) {
			const clientId = Math.random().toString(36).slice(2);

			setUploadedFiles((prev) => [
				...prev,
				{ clientId, filename: file.name, status: "uploading" },
			]);

			uploadApplicationFile({
				applicationId,
				file,
				residentId: slot.residentId,
				category: slot.category,
				documentType: slot.documentType,
			})
				.then(({ fileId }) => {
					setUploadedFiles((prev) =>
						prev.map((f) =>
							f.clientId === clientId ? { ...f, status: "done", fileId } : f,
						),
					);
				})
				.catch(() => {
					setUploadedFiles((prev) =>
						prev.map((f) =>
							f.clientId === clientId ? { ...f, status: "error" } : f,
						),
					);
				});
		}
	}

	return { uploadedFiles, uploadFiles };
}
