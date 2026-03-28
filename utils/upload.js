const multer = require('multer');
// cloudinary is imported but not used directly here —
// the actual upload to Cloudinary happens in userController.updatePhoto
// using req.file.path and req.file.filename.
// Consider using multer-storage-cloudinary to handle the upload automatically.
const cloudinary = require('../config/cloudinary');

const upload = multer({
  // memoryStorage keeps files in RAM as Buffer — no temp files on disk.
  storage: multer.memoryStorage(),
  // 2MB file size limit.
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    // Accept any MIME type starting with 'image' (image/jpeg, image/png, image/webp, etc.)
    if (file.mimetype.startsWith('image')) {
      cb(null, true);
    } else {
      cb(new Error('Not an image'), false);
    }
  },
});

module.exports = upload;
