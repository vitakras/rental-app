export interface BlobStorage {
	putObject(input: {
		key: string;
		contentType: string;
		body: ArrayBuffer;
	}): Promise<void>;

	createDownloadUrl(key: string): Promise<{ downloadUrl: string }>;

	getObject(
		key: string,
	): Promise<{ body: ReadableStream; contentType: string } | null>;

	objectExists(key: string): Promise<boolean>;

	deleteObject(key: string): Promise<void>;
}
