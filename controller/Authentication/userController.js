const User = require('../../model/User/userModel');
const AppError = require('../../utils/AppError');
const catchAsync = require('../../utils/catchAsync');
const cloudinary = require('../../config/cloudinary');
const bcrypt = require('bcrypt');
const LeagueUserProgress = require('../../model/Leagues/leagueUserProgress');

// ── Update profile ────────────────────────────────────────
// Allows updating name, profilePicture, and field only.
// Email and password changes are explicitly blocked here —
// they have dedicated routes (/resetPassword, /updateMe/photo).
exports.updateMe = catchAsync(async (req, res, next) => {
  if (req.body.email)
    return next(new AppError('You cannot change your email!', 403));
  if (req.body.password)
    return next(
      new AppError('You cannot change your password in this route', 401),
    );
  const user = await User.findOne({ email: req.user.email })
    .select(
      '-authProvider -emailVerified -password -role -__v -passwordChangedAt',
    )
    .populate('league subscription projects', 'name');

  if (req.body.name) user.name = req.body.name;
  if (req.body.profilePicture) user.profilePicture = req.body.profilePicture;
  if (req.body.field) user.field = req.body.field;

  await user.save();

  res.status(200).json({
    status: 'success',
    data: {
      user,
    },
  });
});

// ── Get own profile ───────────────────────────────────────
// Returns a safe subset of user fields — sensitive fields like
// password, tokens, and Stripe IDs are excluded manually.
exports.getMe = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user._id)
    .select(
      '-authProvider -emailVerified -password -role -__v -passwordChangedAt',
    )
    .populate('league subscription projects', 'name');
  res.status(200).json({
    status: 'success',
    data: {
      user,
    },
  });
});

// ── Delete account ────────────────────────────────────────
// Permanently deletes the user document.
exports.deleteMe = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email, _id: req.user._id }).select(
    '+password',
  );
  if (!user || !(await bcrypt.compare(password, user.password)))
    return next(new AppError('Please enter your correct email & password'));
  await LeagueUserProgress.findOneAndDelete({ user: req.user._id });
  await User.findByIdAndDelete(req.user._id);
  res.status(204).json({
    status: 'success',
    message: 'Account deleted forever!',
  });
});

// ── Deactivate account ────────────────────────────────────
// Sets active: false instead of deleting. The pre-find hook in userModel
// filters out inactive users from all queries, making them effectively invisible.
exports.deactivateMe = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email, _id: req.user._id }).select(
    '+password',
  );
  if (!user || !(await bcrypt.compare(password, user.password)))
    return next(new AppError('Please enter your correct email & password'));
  await User.findByIdAndUpdate(req.user._id, { active: false });
  res.status(200).json({
    status: 'success',
    message: 'Account deactivated',
  });
});

// ── Update profile photo ──────────────────────────────────
// Deletes the old Cloudinary image (if any) then stores the new one.
// req.file is populated by the multer upload middleware in upload.js.
// req.file.path is the Cloudinary URL and req.file.filename is the public_id.

exports.updatePhoto = catchAsync(async (req, res, next) => {
  if (!req.file) {
    return next(new AppError('Please upload a photo', 400));
  }

  // 1. Delete the old photo if it exists
  if (req.user.photoPublicId) {
    await cloudinary.uploader.destroy(req.user.photoPublicId);
  }

  // 2. Create a helper function to upload the buffer via stream
  const uploadFromBuffer = (req) => {
    return new Promise((resolve, reject) => {
      const cld_upload_stream = cloudinary.uploader.upload_stream(
        { folder: 'byteforce_users' }, // Optional: organize your cloudinary folder
        (error, result) => {
          if (result) {
            resolve(result);
          } else {
            reject(error);
          }
        },
      );
      // NodeJS stream magic: write the buffer to the stream and end it
      const stream = require('stream');
      const readableStream = new stream.PassThrough();
      readableStream.end(req.file.buffer);
      readableStream.pipe(cld_upload_stream);
    });
  };

  // 3. Await the upload
  const result = await uploadFromBuffer(req);

  // 4. Save the actual Cloudinary URLs to the database
  req.user.profilePicture = result.secure_url;
  req.user.photoPublicId = result.public_id;
  await req.user.save({ validateBeforeSave: false });

  res.status(200).json({
    status: 'success',
    data: {
      photo: req.user.profilePicture,
    },
  });
});
