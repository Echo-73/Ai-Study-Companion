import multer from 'multer';
import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';
import { storageService } from '../services/storageService';

/**
 * Middleware guard that verifies persistent storage is configured before processing uploads.
 * On Render Free (production without external object storage), it returns HTTP 503 instead of crashing
 * or silently storing files on an ephemeral filesystem.
 */
export const requirePersistentStorage = (req: Request, _res: Response, next: NextFunction): void => {
  if (!storageService.isPersistentStorageConfigured()) {
    return next(
      new AppError(
        'Persistent PDF storage is not configured in this deployment. File uploads are disabled on Render Free.',
        503
      )
    );
  }
  next();
};

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    try {
      const dir = storageService.ensureLocalStorageDir();
      cb(null, dir);
    } catch (err: any) {
      cb(err, '');
    }
  },
  filename: (_req, _file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `doc-${uniqueSuffix}.pdf`);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB limit
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
      cb(null, true);
    } else {
      cb(new AppError('Only PDF files are allowed for material upload.', 400));
    }
  },
});

