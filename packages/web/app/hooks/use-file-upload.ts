import type { ApplicationDocumentCategory, ApplicationDocumentType } from "api";
import { useState } from "react";
import { deleteApplicationFile } from "~/.client/delete-application-file";
import {
	UploadValidationError,
	uploadApplicationFile,
} from "~/.client/upload-application-file";

export interface UploadedFile {
	clientId: string;
	filename: string;
	status: "uploading" | "done" | "error";
	errorMessage?: string;
	fileId?: string;
	_file?: File;
}

export interface ExistingFile {
	fileId: string;
	filename: string;
}

interface SlotInfo {
	residentId: number;
	category: ApplicationDocumentCategory;
	documentType: ApplicationDocumentType;
}

export function useFileUpload(
	applicationId: number,
	slot: SlotInfo,
	existingFiles: ExistingFile[] = [],
) {
	const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>(() =>
		existingFiles.map((f) => ({
			clientId: f.fileId,
			filename: f.filename,
			status: "done" as const,
			fileId: f.fileId,
		})),
	);

	function uploadFiles(files: FileList) {
		for (const file of Array.from(files)) {
			const clientId = Math.random().toString(36).slice(2);

			setUploadedFiles((prev) => [
				...prev,
				{ clientId, filename: file.name, status: "uploading", _file: file },
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
				.catch((error: unknown) => {
					const errorMessage =
						error instanceof UploadValidationError
							? error.message
							: "Upload failed. Please try again.";

					setUploadedFiles((prev) =>
						prev.map((f) =>
							f.clientId === clientId
								? { ...f, status: "error", errorMessage }
								: f,
						),
					);
				});
		}
	}

	function removeFile(clientId: string) {
		const file = uploadedFiles.find((f) => f.clientId === clientId);
		if (!file) return;

		if (file.status === "error") {
			setUploadedFiles((prev) => prev.filter((f) => f.clientId !== clientId));
			return;
		}

		if (file.status !== "done" || !file.fileId) return;

		const { fileId } = file;
		setUploadedFiles((prev) => prev.filter((f) => f.clientId !== clientId));
		deleteApplicationFile(applicationId, fileId).catch(() => {});
	}

	function retryFile(clientId: string) {
		const file = uploadedFiles.find((f) => f.clientId === clientId);
		if (!file || file.status !== "error" || !file._file) return;

		const originalFile = file._file;
		setUploadedFiles((prev) =>
			prev.map((f) =>
				f.clientId === clientId
					? { ...f, status: "uploading", errorMessage: undefined }
					: f,
			),
		);

		uploadApplicationFile({
			applicationId,
			file: originalFile,
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
			.catch((error: unknown) => {
				const errorMessage =
					error instanceof UploadValidationError
						? error.message
						: "Upload failed. Please try again.";

				setUploadedFiles((prev) =>
					prev.map((f) =>
						f.clientId === clientId
							? { ...f, status: "error", errorMessage }
							: f,
					),
				);
			});
	}

	return { uploadedFiles, uploadFiles, removeFile, retryFile };
}
