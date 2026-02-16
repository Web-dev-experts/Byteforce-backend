require('dotenv').config({ path: '../../config.env' });
const { default: nodeCron } = require('node-cron');
const User = require('../../model/User/userModel');
const catchAsync = require('../../utils/catchAsync');
const nodemailer = require('nodemailer');
const AppError = require('../../utils/AppError');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const passport = require('passport');
const Email = require('../../utils/email');
const fs = require('fs');
const path = require('path');

const signToken = function (_id) {
  const token = jwt.sign({ _id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES,
  });

  return token;
};

const createSendToken = function (user, cookie, res) {
  const token = signToken(user._id);

  const cookieOptions = {
    httpOnly: true,
    secure: false,
    samesite: 'lax',
    maxAge: 900000,
  };

  res.cookie('jwt', token, cookieOptions);

  res.status(200).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const { name, email, password, confirmPassword, profilePicture } = req.body;

  // 1) user passes inputs
  await User.create({
    name,
    email,
    password,
    confirmPassword,
    profilePicture,
  });

  const newUser = await User.findOne({ email }).select(
    '+emailVerificationCode +emailVerificationExpires +emailVerified',
  );

  // 2) creates a random code
  const verificationCode = crypto.randomInt(100000, 1000000);

  newUser.emailVerificationCode = verificationCode;
  newUser.emailVerificationExpires = Date.now() + 60 * 10 * 1000;

  const templatePath = path.join(
    __dirname,
    '../../utils/templates/verifyEmail.html',
  );
  const html = fs
    .readFileSync(templatePath, 'utf-8')
    .replace('{{CODE}}', verificationCode);

  await newUser.save();

  // 3) sends a code as an email
  try {
    const emailFn = new Email(html, email, 'Verify yoour email!');
    await emailFn.send();
    res.status(201).json({
      status: 'success',
      message: 'Check your email!',
    });
  } catch (err) {
    console.log(err);
    await User.deleteOne({ email });
    return next(new AppError('Failed sending verification email!', 500));
  }
});

exports.verifyAccount = catchAsync(async (req, res, next) => {
  const { email, emailCode } = req.body;

  const user = await User.findOne({ email }).select(
    '+emailVerificationCode +emailVerificationExpires +emailVerified',
  );

  if (!user) return next(new AppError('There is no user with this email', 401));
  if (
    user.emailVerificationCode !== Number(emailCode) ||
    user.emailVerificationExpires < Date.now()
  )
    return next(
      new AppError(
        'The email verification is wrong or has expired! Please enter a new one',
        401,
      ),
    );

  user.emailVerified = true;
  user.emailVerificationCode = undefined;
  user.emailVerificationExpires = undefined;

  await user.save();

  res.status(201).json({
    status: 'success',
    data: {
      user,
    },
  });
});

exports.protectVerified = (req, res, next) => {
  if (!req.user.emailVerified) {
    return next(
      new AppError('Please verify your email to access this resource', 403),
    );
  }
  next();
};

exports.logout = (req, res, next) => {
  res.cookie('jwt', '', {
    httpOnly: true,
    secure: false,
    samesite: 'none',
    maxAge: 1,
  });

  res.status(200).json({
    status: 'success',
  });
};

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password)
    return next(new AppError('You must enter a password and an email!', 401));

  const user = await User.findOne({ email }).select('+emailVerified');
  if (!user || !(await user.comparePasswords(password)))
    return next(new AppError('The email or password is wrong!', 401));
  if (!user.emailVerified)
    return next(
      new AppError('Please verify your email before logging in', 403),
    );

  createSendToken(user, 'jwt', res);
});

exports.protect = catchAsync(async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  } else if (req.headers.cookie && req.headers.cookie.startsWith('jwt=')) {
    token = req.headers.cookie.replace('jwt=', '');
  }

  if (!token) return next(new AppError('You are not logged in!', 401));

  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  if (!decoded)
    return next(new AppError('You are not logged in! Please log in ', 400));

  const user = await User.findById(decoded._id).select('+emailVerified');

  if (!user) return next(new AppError('This user no longer exists!', 404));

  if (user.passwordChangedAfter(decoded.iat))
    return next(
      new AppError('The user changed password password after logging in!', 400),
    );

  req.user = user;
  next();
});

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role))
      return next(
        new AppError('You do not have permission to perform this act', 403),
      );
    next();
  };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  const { email } = req.body;

  const user = await User.findOne({ email });

  if (!user) return next('There is no user with this email!', 401);

  await user.createPasswordCode();
  await user.save({ validateBeforeSave: false });

  try {
    const templatePath = path.join(
      __dirname,
      '../../utils/templates/resetPassword.html',
    );
    const html = fs
      .readFileSync(templatePath, 'utf-8')
      .replace('{{code}}', `${user.passwordResetCode}`);

    await user.save();
    const emailFn = new Email(html, email, 'Reset your password!');
    await emailFn.send();
    res.status(200).json({
      status: 'success',
      message: 'message',
    });
  } catch (err) {
    console.log(err);
    return next(new AppError('Failed sending password reset email!', 500));
  }
});

exports.resetCodeCheck = catchAsync(async (req, res, next) => {
  const { email, code } = req.body;
  const user = await User.findOne({
    email,
    passwordResetCode: code,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) return next(new AppError('Invalid or expired code!', 401));

  const resetToken = jwt.sign(
    { id: user._id, purpose: 'reset-password' },
    process.env.JWT_SECRET,
    { expiresIn: '10m' },
  );

  res.status(200).json({
    status: 'success',
    resetToken,
  });
});

exports.protectReset = catchAsync(async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return next(new AppError('Reset token missing', 401));
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  if (decoded.purpose !== 'reset-password') {
    return next(new AppError('Invalid reset token', 401));
  }

  req.userId = decoded.id;
  next();
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  const { email, password, confirmPassword } = req.body;
  if (!password || !confirmPassword)
    return next(
      new AppError('You must enter the password and its confirmation!', 401),
    );

  const user = await User.findOne({ email });

  user.password = password;
  user.confirmPassword = confirmPassword;

  user.passwordResetCode = undefined;
  user.passwordResetExpires = undefined;
  user.passwordChangedAt = new Date(Date.now()).toISOString();

  await user.save();

  createSendToken(user, 'jwt', res);
});

exports.googleAuth = passport.authenticate('google', {
  scope: ['profile', 'email'],
});

exports.googleCallback = async (req, res, next) => {
  try {
    const googleUser = req.user;

    let user = await User.findOne({
      $or: [{ googleId: googleUser.googleId }, { email: googleUser.email }],
    });

    if (!user) {
      user = await User.create({
        name: googleUser.name,
        email: googleUser.email,
        profilePicture: googleUser.profilePicture,
        googleId: googleUser.googleId,
        authProvider: 'google',
        emailVerified: true,
      });
    } else if (!user.googleId) {
      user.googleId = googleUser.googleId;
      user.authProvider = 'google';
      user.emailVerified = true;
      await user.save();
    }

    const token = signToken(user._id);

    res.redirect(`${process.env.FRONTEND_URL}?token=${token}`);
    res.status(200).json({
      status: 'success',
      token,
      user,
    });
  } catch (err) {
    next(err);
  }
};

exports.githubAuth = passport.authenticate('github');

exports.githubCallback = catchAsync(async (req, res, next) => {
  const githubUser = req.user;

  if (!githubUser.email) {
    return next(
      new AppError('GitHub account has no public email. Please add one.', 400),
    );
  }

  let user = await User.findOne({
    $or: [{ githubId: githubUser.githubId }, { email: githubUser.email }],
  });

  if (!user) {
    user = await User.create({
      name: githubUser.name,
      email: githubUser.email,
      profilePicture: githubUser.profilePicture,
      githubId: githubUser.githubId,
      authProvider: 'github',
      emailVerified: true,
    });
  } else if (!user.githubId) {
    user.githubId = githubUser.githubId;
    user.authProvider = 'github';
    user.emailVerified = true;
    await user.save();
  }

  const token = signToken(user._id);

  res.redirect(`${process.env.FRONTEND_URL}?token=${token}`);
  res.status(200).json({
    status: 'success',
    token,
    user,
  });
});
