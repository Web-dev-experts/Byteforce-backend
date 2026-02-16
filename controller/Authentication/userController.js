const User = require('../../model/User/userModel');
const AppError = require('../../utils/AppError');
const catchAsync = require('../../utils/catchAsync');
const cloudinary = require('../../config/cloudinary');

exports.updateMe = catchAsync(async (req, res, next) => {
  if (req.body.email)
    return next(new AppError('You cannot change your email!', 403));
  if (req.body.password)
    return next(
      new AppError('You cannot change your password in this route', 401),
    );
  const user = await User.findOne({ email: req.user.email });

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

exports.getMe = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user._id);
  const {
    name,
    email,
    profilePicture,
    league,
    XP,
    syntaxForces,
    level,
    coins,
    streak,
    projects,
    field,
  } = user;
  const formattedUser = {
    name,
    email,
    profilePicture,
    league,
    XP,
    syntaxForces,
    level,
    coins,
    streak,
    projects,
    field,
  };
  res.status(200).json({
    status: 'success',
    data: {
      user: formattedUser,
    },
  });
});

exports.deleteMe = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  const user = User.findOne({ email, password, _id: req.user._id });
  if (!user)
    return next(new AppError('Please enter your correct email & password'));
  await User.findByIdAndDelete(req.user._id);
  res.status(204).json({
    status: 'success',
    message: 'Account deleted forever!',
  });
});

exports.deactivateMe = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  const user = User.findOne({ email, password, _id: req.user._id });
  if (!user)
    return next(new AppError('Please enter your correct email & password'));
  await User.findByIdAndUpdate(req.user._id, { active: false });
  res.status(200).json({
    status: 'success',
    message: 'Account deactivated',
  });
});

exports.updatePhoto = catchAsync(async (req, res, next) => {
  if (!req.file) {
    return next(new AppError('Please upload a photo', 400));
  }

  if (req.user.photoPublicId) {
    console.log(req.user.photoPublicId);
    await cloudinary.uploader.destroy(req.user.photoPublicId);
  }

  req.user.profilePicture = req.file.path;
  req.user.photoPublicId = req.file.filename;
  await req.user.save({ validateBeforeSave: false });

  res.status(200).json({
    status: 'success',
    data: {
      photo: req.user.profilePicture,
    },
  });
});
