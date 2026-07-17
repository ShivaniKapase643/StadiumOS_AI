import multer from 'multer';
import path from 'path';
import os from 'os';

// Files land in the OS temp dir first; uploadFile() in utils/cloudinary.ts
// moves them to Cloudinary or to the local /uploads dir afterwards.
export const upload = multer({
  dest: os.tmpdir(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (jpg, jpeg, png, webp) are allowed'));
    }
  },
});
