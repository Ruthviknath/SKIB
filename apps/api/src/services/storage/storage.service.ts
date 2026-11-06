import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import multer from 'multer';
import { config } from '../../lib/config';
import { AppError } from '../../lib/errors';

/** Storage contract. Swap LocalDiskStorage for S3/Cloudinary later without touching features. */
export interface StorageService {
  save(buffer: Buffer, mimeType: string): Promise<string>; // returns storage key
  remove(key: string): Promise<void>;
  urlFor(key: string): string;
}

export const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

class LocalDiskStorage implements StorageService {
  constructor(private readonly dir: string) {}

  async save(buffer: Buffer, mimeType: string): Promise<string> {
    const ext = ALLOWED_IMAGE_TYPES[mimeType];
    if (!ext) throw new AppError(400, 'UNSUPPORTED_FILE_TYPE', 'Only JPEG, PNG or WebP images are allowed');
    await fs.mkdir(this.dir, { recursive: true });
    const key = `${crypto.randomUUID()}${ext}`;
    await fs.writeFile(path.join(this.dir, key), buffer);
    return key;
  }

  async remove(key: string): Promise<void> {
    await fs.rm(path.join(this.dir, path.basename(key)), { force: true });
  }

  urlFor(key: string): string {
    return `${config.publicUrl}/uploads/${key}`;
  }
}

export const storage: StorageService = new LocalDiskStorage(config.storage.uploadDir);

/** Multer middleware for a single image field held in memory, then handed to `storage.save`. */
export const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.storage.maxFileBytes, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_IMAGE_TYPES[file.mimetype]) cb(null, true);
    else cb(new AppError(400, 'UNSUPPORTED_FILE_TYPE', 'Only JPEG, PNG or WebP images are allowed'));
  },
});
