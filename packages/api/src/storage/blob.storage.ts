export interface BlobStorage {
	putObject(input: {
		key: string;
		contentType: string;
		body: ArrayBuffer;
	}): Promise<void>;

	createDownloadUrl(key: string): Promise<{ downloadUrl: string }>;

	objectExists(key: string): Promise<boolean>;

	deleteObject(key: string): Promise<void>;
}
