export interface BlobStorage {
  createUploadUrl(input: {
    key: string;
    contentType: string;
    sizeBytes: number;
  }): Promise<{ uploadUrl: string }>;

  createDownloadUrl(key: string): Promise<{ downloadUrl: string }>;

  deleteObject(key: string): Promise<void>;
}
