import { Storage } from "@google-cloud/storage";
import { readFile, writeFile, mkdir, unlink, stat } from "fs/promises";
import path from "path";

interface SignedUrlOptions {
  expiresIn?: number; // seconds, default 15 minutes
  filename?: string; // for Content-Disposition header
}

interface StorageService {
  upload(key: string, buffer: Buffer, contentType: string): Promise<void>;
  download(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  getSignedUrl(key: string, options?: SignedUrlOptions): Promise<string | null>;
  exists(key: string): Promise<boolean>;
  isLocal(): boolean;
}

// GCS Storage Implementation
class GCSStorage implements StorageService {
  private storage: Storage;
  private bucketName: string;

  constructor() {
    const projectId = process.env.GCS_PROJECT_ID;
    const bucketName = process.env.GCS_BUCKET_NAME;

    if (!bucketName) {
      throw new Error("GCS_BUCKET_NAME is required for GCS storage");
    }

    this.bucketName = bucketName;

    // Support both service account JSON file and inline credentials (for serverless)
    if (process.env.GCS_CLIENT_EMAIL && process.env.GCS_PRIVATE_KEY) {
      this.storage = new Storage({
        projectId,
        credentials: {
          client_email: process.env.GCS_CLIENT_EMAIL,
          private_key: process.env.GCS_PRIVATE_KEY.replace(/\\n/g, "\n"),
        },
      });
    } else {
      // Uses GOOGLE_APPLICATION_CREDENTIALS env var or default credentials
      this.storage = new Storage({ projectId });
    }
  }

  private get bucket() {
    return this.storage.bucket(this.bucketName);
  }

  async upload(key: string, buffer: Buffer, contentType: string): Promise<void> {
    const file = this.bucket.file(key);
    await file.save(buffer, {
      contentType,
      resumable: false,
    });
  }

  async download(key: string): Promise<Buffer> {
    const file = this.bucket.file(key);
    const [contents] = await file.download();
    return contents;
  }

  async delete(key: string): Promise<void> {
    const file = this.bucket.file(key);
    await file.delete().catch(() => undefined); // Ignore if not exists
  }

  async getSignedUrl(key: string, options?: SignedUrlOptions): Promise<string> {
    const file = this.bucket.file(key);
    const expiresIn = options?.expiresIn ?? 15 * 60; // 15 minutes default

    const [url] = await file.getSignedUrl({
      version: "v4",
      action: "read",
      expires: Date.now() + expiresIn * 1000,
      responseDisposition: options?.filename
        ? `inline; filename="${options.filename}"`
        : undefined,
    });

    return url;
  }

  async exists(key: string): Promise<boolean> {
    const file = this.bucket.file(key);
    const [exists] = await file.exists();
    return exists;
  }

  isLocal(): boolean {
    return false;
  }
}

// Local Filesystem Storage Implementation (for development)
class LocalStorage implements StorageService {
  private baseDir: string;

  constructor() {
    this.baseDir = path.join(process.cwd(), "uploads");
  }

  private getFullPath(key: string): string {
    return path.join(this.baseDir, key);
  }

  async upload(key: string, buffer: Buffer, _contentType: string): Promise<void> {
    const fullPath = this.getFullPath(key);
    const dir = path.dirname(fullPath);
    await mkdir(dir, { recursive: true });
    await writeFile(fullPath, buffer);
  }

  async download(key: string): Promise<Buffer> {
    const fullPath = this.getFullPath(key);
    return readFile(fullPath);
  }

  async delete(key: string): Promise<void> {
    const fullPath = this.getFullPath(key);
    await unlink(fullPath).catch(() => undefined);
  }

  async getSignedUrl(_key: string, _options?: SignedUrlOptions): Promise<string | null> {
    // Local storage doesn't support signed URLs - return null to signal direct serve
    return null;
  }

  async exists(key: string): Promise<boolean> {
    const fullPath = this.getFullPath(key);
    try {
      await stat(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  isLocal(): boolean {
    return true;
  }
}

// Singleton storage instance
let storageInstance: StorageService | null = null;

function createStorage(): StorageService {
  if (process.env.GCS_BUCKET_NAME) {
    return new GCSStorage();
  }
  return new LocalStorage();
}

export function getStorage(): StorageService {
  if (!storageInstance) {
    storageInstance = createStorage();
  }
  return storageInstance;
}

// Convenience export for direct import
export const storage = {
  get instance() {
    return getStorage();
  },
  upload: (key: string, buffer: Buffer, contentType: string) =>
    getStorage().upload(key, buffer, contentType),
  download: (key: string) => getStorage().download(key),
  delete: (key: string) => getStorage().delete(key),
  getSignedUrl: (key: string, options?: SignedUrlOptions) =>
    getStorage().getSignedUrl(key, options),
  exists: (key: string) => getStorage().exists(key),
  isLocal: () => getStorage().isLocal(),
};
