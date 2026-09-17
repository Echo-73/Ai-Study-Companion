import multer from 'multer';
import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';
import { storageService } from '../services/storageService';

/**
 * Middleware guard that verifies persistent storage is configured before processing uploads.
 * On Render Free (production without S3 object storage), it returns HTTP 503 with a clear message
 * instead of crashing or silently storing files on an ephemeral filesystem.
 */
export const requirePersistentStorage = (_req: Request, _res: Response, next: NextFunction): void => {
  const status = storageService.getStorageStatus();
  if (!status.configured) {
    return next(
      new AppError(
        status.message || 'Persistent PDF storage is not configured in this deployment. File uploads are disabled.',
        503
      )
    );
  }
  next();
};

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB limit
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
      cb(null, true);
    } else {
      cb(new AppError('Only PDF files are allowed for material upload.', 400));
    }
  },
});
