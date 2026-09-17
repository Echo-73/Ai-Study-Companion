import path from 'path';
import fs from 'fs';
import { logger } from '../config/logger';

export type StorageProviderType = 'local' | 'disabled';

export class StorageService {
  /**
   * Determine the active storage provider type.
   * - 'local': In development or test environments where local disk storage is allowed.
   * - 'disabled': In production environments (such as Render Free) where persistent disk is unavailable.
   *   (Future object storage providers like S3 can be integrated here once implemented).
   */
  getStorageType(): StorageProviderType {
    if (process.env.NODE_ENV === 'production') {
      return 'disabled';
    }
    return 'local';
  }

  /**
   * Check whether persistent storage is configured and available.
   */
  isPersistentStorageConfigured(): boolean {
    return this.getStorageType() !== 'disabled';
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
}

export const storageService = new StorageService();
