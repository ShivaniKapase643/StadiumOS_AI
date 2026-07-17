import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs/promises';
import path from 'path';
import { env } from '../config/env';

if (env.cloudinary.configured) {
  cloudinary.config({
    cloud_name: env.cloudinary.cloudName,
    api_key: env.cloudinary.apiKey,
    api_secret: env.cloudinary.apiSecret,
  });
}

const UPLOADS_DIR = path.join(__dirname, '../../uploads');

/**
 * Uploads a local file and returns a public URL. Uses Cloudinary when
 * configured; otherwise persists to local disk under /uploads and returns a
 * server-relative URL — same call site either way.
 */
export async function uploadFile(localPath: string, folder: string): Promise<string> {
  if (env.cloudinary.configured) {
    const result = await cloudinary.uploader.upload(localPath, { folder });
    await fs.unlink(localPath).catch(() => undefined);
    return result.secure_url;
  }

  await fs.mkdir(path.join(UPLOADS_DIR, folder), { recursive: true });
  const filename = path.basename(localPath);
  const destPath = path.join(UPLOADS_DIR, folder, filename);
  await fs.rename(localPath, destPath);
  return `/uploads/${folder}/${filename}`;
}
