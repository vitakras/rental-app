export interface BlobStorage {
	createUploadUrl(input: {
		key: string;
		contentType: string;
		sizeBytes: number;
	}): Promise<{ uploadUrl: string }>;

	createDownloadUrl(key: string): Promise<{ downloadUrl: string }>;

	objectExists(key: string): Promise<boolean>;

	deleteObject(key: string): Promise<void>;
}
