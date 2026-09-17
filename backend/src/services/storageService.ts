import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { logger } from '../config/logger';
import { AppError } from '../middleware/errorHandler';

export type StorageProviderType = 'local' | 's3' | 'disabled';

export interface SaveFileParams {
  projectId: string;
  originalName: string;
  buffer: Buffer;
  mimeType?: string;
}

export interface SaveFileResult {
  fileUrl: string;
  storageKey: string;
  provider: StorageProviderType;
}

export interface StorageStatus {
  configured: boolean;
  provider: StorageProviderType;
  message?: string;
}

export class StorageService {
  private s3Client: S3Client | null = null;

  /**
   * Inject or override S3Client (useful for unit tests and custom credentials).
   */
  setS3Client(client: S3Client | null): void {
    this.s3Client = client;
  }

  /**
   * Reset client cache (useful when environment variables change).
   */
  resetClient(): void {
    this.s3Client = null;
  }

  /**
   * Check if required S3 environment variables are provided.
   */
  hasS3Config(): boolean {
    const bucket = process.env.S3_BUCKET;
    const accessKey = process.env.S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
    const secretKey = process.env.S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;
    return Boolean(bucket && accessKey && secretKey);
  }

  /**
   * Determine the active storage provider type:
   * - 's3': When S3 configuration is present (or explicitly requested via STORAGE_PROVIDER=s3).
   * - 'local': In development or test environments where local disk storage is allowed.
   * - 'disabled': In production environments (such as Render Free) when S3 is not configured.
   */
  getStorageType(): StorageProviderType {
    // 1. Production strictly enforces object storage; local storage is NEVER allowed in production
    if (process.env.NODE_ENV === 'production') {
      return this.hasS3Config() ? 's3' : 'disabled';
    }

    // 2. Non-production (development/test) environments
    if (process.env.STORAGE_PROVIDER === 'local') {
      return 'local';
    }
    if (process.env.STORAGE_PROVIDER === 's3') {
      return this.hasS3Config() ? 's3' : 'disabled';
    }

    // Default for development/test: use S3 if configured, otherwise fallback to local disk
    if (this.hasS3Config()) {
      return 's3';
    }

    return 'local';
  }

  /**
   * Get human-readable status and explanation if storage is unconfigured.
   */
  getStorageStatus(): StorageStatus {
    const provider = this.getStorageType();
    if (provider === 'disabled') {
      return {
        configured: false,
        provider: 'disabled',
        message:
          'Persistent PDF storage is not configured in this deployment. Missing S3 object storage environment variables (S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY).',
      };
    }
    return {
      configured: true,
      provider,
    };
  }

  /**
   * Check whether persistent storage is configured and available.
   */
  isPersistentStorageConfigured(): boolean {
    return this.getStorageType() !== 'disabled';
  }

  /**
   * Lazy initialization of the AWS S3 client.
   */
  private getS3Client(): S3Client {
    if (this.s3Client) {
      return this.s3Client;
    }

    const accessKeyId = process.env.S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || '';
    const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || '';
    const region = process.env.S3_REGION || process.env.AWS_REGION || 'us-east-1';
    const endpoint = process.env.S3_ENDPOINT || undefined;
    const forcePathStyle = process.env.S3_FORCE_PATH_STYLE === 'true';

    this.s3Client = new S3Client({
      region,
      endpoint,
      forcePathStyle,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    return this.s3Client;
  }

  /**
   * Get configured S3 bucket name.
   */
  getBucketName(): string {
    return process.env.S3_BUCKET || '';
  }

  /**
   * Get the local upload directory path for development/testing.
   */
  getLocalStorageDir(): string {
    if (process.env.UPLOADS_DIR && process.env.NODE_ENV !== 'production') {
      return path.resolve(process.env.UPLOADS_DIR);
    }
    return path.join(__dirname, '../../../uploads');
  }

  /**
   * Lazily ensure that the local directory exists on demand.
   * Never called at module import/startup time.
   */
  ensureLocalStorageDir(): string {
    const dir = this.getLocalStorageDir();
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      logger.info(`Initialized local uploads directory at ${dir}`);
    }
    return dir;
  }

  /**
   * Save an uploaded file to the active storage medium.
   * - S3 in production: sends PutObjectCommand to bucket.
   * - Local in dev/test: writes file to local uploads directory.
   */
  async saveFile(params: SaveFileParams): Promise<SaveFileResult> {
    const provider = this.getStorageType();

    if (provider === 'disabled') {
      const status = this.getStorageStatus();
      throw new AppError(status.message || 'Persistent PDF storage is not configured.', 503);
    }

    const sanitizedName = (params.originalName || 'document.pdf')
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .toLowerCase();

    if (provider === 's3') {
      const client = this.getS3Client();
      const bucket = this.getBucketName();
      const key = `projects/${params.projectId}/materials/${Date.now()}-${uuidv4()}-${sanitizedName}`;

      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: params.buffer,
          ContentType: params.mimeType || 'application/pdf',
        })
      );

      logger.info(`Uploaded file to S3: s3://${bucket}/${key}`);
      return {
        fileUrl: key,
        storageKey: key,
        provider: 's3',
      };
    }

    // Local disk storage (development / test mode)
    const dir = this.ensureLocalStorageDir();
    const filename = `doc-${Date.now()}-${uuidv4()}-${sanitizedName}`;
    const localPath = path.join(dir, filename);

    await fs.promises.writeFile(localPath, params.buffer);
    logger.info(`Saved file to local disk: ${localPath}`);

    return {
      fileUrl: localPath,
      storageKey: filename,
      provider: 'local',
    };
  }

  /**
   * Retrieve the file content as a Buffer for PDF processing.
   * Works for both S3 object keys and local filesystem paths.
   */
  async getFileBuffer(fileUrlOrKey: string): Promise<Buffer> {
    if (!fileUrlOrKey) {
      throw new AppError('Storage key or path is required to retrieve file', 400);
    }

    // 1. Check if it is an existing local filesystem file (development/testing)
    if (fs.existsSync(fileUrlOrKey)) {
      return fs.promises.readFile(fileUrlOrKey);
    }

    // 2. If it's stored in S3 or local file is missing but S3 is configured
    if (this.hasS3Config() || this.s3Client) {
      try {
        const client = this.getS3Client();
        const bucket = this.getBucketName();
        // Support keys that might have been stored as s3://bucket/key or direct key
        const key = fileUrlOrKey.startsWith('s3://')
          ? fileUrlOrKey.split('/').slice(3).join('/')
          : fileUrlOrKey;

        const response = await client.send(
          new GetObjectCommand({
            Bucket: bucket,
            Key: key,
          })
        );

        if (!response.Body) {
          throw new AppError(`Empty body returned from S3 for key ${key}`, 500);
        }

        const byteArray = await response.Body.transformToByteArray();
        return Buffer.from(byteArray);
      } catch (err: any) {
        logger.error(`Failed to retrieve file from S3 (${fileUrlOrKey}):`, err);
        throw new AppError(`Failed to retrieve file from storage: ${err.message}`, 404);
      }
    }

    throw new AppError(`File not found in storage: ${fileUrlOrKey}`, 404);
  }

  /**
   * Delete a file from storage if needed.
   */
  async deleteFile(fileUrlOrKey: string): Promise<void> {
    if (fs.existsSync(fileUrlOrKey)) {
      await fs.promises.unlink(fileUrlOrKey);
      return;
    }

    if (this.hasS3Config() || this.s3Client) {
      const client = this.getS3Client();
      const bucket = this.getBucketName();
      const key = fileUrlOrKey.startsWith('s3://')
        ? fileUrlOrKey.split('/').slice(3).join('/')
        : fileUrlOrKey;

      await client.send(
        new DeleteObjectCommand({
          Bucket: bucket,
          Key: key,
        })
      );
    }
  }
}

export const storageService = new StorageService();
