import multer from 'multer';
import path from 'path';
import fs from 'fs';

const uploadsDir = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const logoExtensions = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };
    const ext = file.fieldname === 'logo' ? logoExtensions[file.mimetype] : (path.extname(file.originalname) || '.png');
    cb(null, `${file.fieldname === 'logo' ? 'sponsor-logo' : 'poster'}-${uniqueSuffix}${ext}`);
  },
});

export const upload = multer({ storage });

const logoUpload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype)) {
      const error = new Error('Company logo must be a JPG, PNG, or WebP image.');
      error.status = 400;
      cb(error);
      return;
    }
    cb(null, true);
  },
});

export function uploadSponsorshipLogo(req, res, next) {
  logoUpload.single('logo')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ message: err.code === 'LIMIT_FILE_SIZE' ? 'Company logo must be 2 MB or smaller.' : err.message });
      }
      if (err.status === 400) return res.status(400).json({ message: err.message });
      return next(err);
    }
    next();
  });
}
