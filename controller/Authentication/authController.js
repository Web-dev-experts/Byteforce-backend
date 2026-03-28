require('dotenv').config({ path: '../../config.env' });
const User = require('../../model/User/userModel');
const catchAsync = require('../../utils/catchAsync');
const AppError = require('../../utils/AppError');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const passport = require('passport');
const Email = require('../../utils/email');
const fs = require('fs');
const path = require('path');

// ── Token helpers ─────────────────────────────────────────

// Signs a JWT with the user's _id as payload.
// Expiry is controlled by JWT_EXPIRES in config.env (currently "90d").
const signToken = function (_id) {
  const token = jwt.sign({ _id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES,
  });

  return token;
};

// Creates and sends the JWT both as a cookie and in the response body.
const createSendToken = async function (user, cookie, res) {
  const token = signToken(user._id);

  // secure: true ensures cookie is only sent over HTTPS.
  // sameSite: 'strict' prevents the cookie from being sent in cross-site requests (CSRF protection).
  // The JWT in the body will still work after the cookie expires.
  const cookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 7776000 * 1000,
  };

  res.cookie(cookie, token, cookieOptions);
  const userData = await User.findById(user._id).select(
    '-authProvider -emailVerified -password -role -__v -passwordChangedAt',
  );
  res.status(200).json({
    status: 'success',
    token,
    data: {
      user: userData,
    },
  });
};

// ── Signup ────────────────────────────────────────────────
// Creates the user, then immediately re-fetches to get hidden fields (+emailVerificationCode).
// On email send failure: the user document is deleted to keep the DB clean.
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
  // the compiled template in memory to avoid disk reads on every signup.
  const html = fs
    .readFileSync(templatePath, 'utf-8')
    .replace('{{CODE}}', verificationCode);

  await newUser.save();

  // 3) sends a code as an email
  try {
    const emailFn = new Email(html, email, 'Verify your email!');
    await emailFn.send();
    res.status(201).json({
      status: 'success',
      message: 'Check your email!',
    });
  } catch (err) {
    console.log(err);
    // Clean up: if the email fails, delete the user so they can try again.
    await User.deleteOne({ email });
    return next(new AppError('Failed sending verification email!', 500));
  }
});

// ── Email verification ────────────────────────────────────
// Validates the 6-digit code sent to the user's email.
// Code and expiry are both checked in a single condition.
exports.verifyAccount = catchAsync(async (req, res, next) => {
  const { email, emailCode } = req.body;

  const user = await User.findOne({ email }).select(
    '+emailVerificationCode +emailVerificationExpires +emailVerified -authProvider -emailVerified -password -role -__v -passwordChangedAt',
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
  // Clear code and expiry after successful verification.
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

// ── Route guard: email verified ───────────────────────────
// Middleware that blocks access to any route if the user's email is not verified.
// Must run after `protect` since it reads req.user.
exports.protectVerified = (req, res, next) => {
  if (!req.user.emailVerified) {
    return next(
      new AppError('Please verify your email to access this resource', 403),
    );
  }
  next();
};

// ── Logout ────────────────────────────────────────────────
// Overwrites the JWT cookie with an empty string and maxAge of 1ms
// to immediately expire it in the browser.
exports.logout = (req, res, next) => {
  res.cookie('jwt', '', {
    httpOnly: true,
    secure: false,
    sameSite: 'strict',
    maxAge: 1,
  });

  res.status(200).json({
    status: 'success',
  });
};

// ── Login ─────────────────────────────────────────────────
// Verifies email + password then issues a JWT.
// emailVerified is explicitly selected because it has select: false on the schema.
exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password)
    return next(new AppError('You must enter a password and an email!', 401));

  const user = await User.findOne({ email }).select('+emailVerified');
  // comparePasswords uses bcrypt.compare — the same generic error message is returned
  // for both "user not found" and "wrong password" to prevent user enumeration.
  if (!user || !(await user.comparePasswords(password)))
    return next(new AppError('The email or password is wrong!', 401));
  if (!user.emailVerified)
    return next(
      new AppError('Please verify your email before logging in', 403),
    );

  createSendToken(user, 'jwt', res);
});

// ── Route guard: authenticated ────────────────────────────
// Extracts JWT from Authorization header, cookie, or raw cookie header.
// Verifies signature, checks user still exists, and checks if password
// was changed after the token was issued.
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
    // Fallback raw cookie parsing — handles clients that don't use the cookie-parser middleware.
    token = req.headers.cookie.replace('jwt=', '');
  }

  if (!token) return next(new AppError('You are not logged in!', 401));

  // promisify converts jwt.verify's callback-based API to a Promise.
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  // jwt.verify throws on invalid/expired tokens, so decoded being falsy here
  // is effectively unreachable — the catch in catchAsync handles it.
  if (!decoded)
    return next(new AppError('You are not logged in! Please log in ', 400));

  // Re-fetch the user on every request to ensure they still exist and are active.
  const user = await User.findById(decoded._id).select('+emailVerified');

  if (!user) return next(new AppError('This user no longer exists!', 404));

  // Invalidates old tokens after a password change.
  if (user.passwordChangedAfter(decoded.iat))
    return next(
      new AppError('The user changed password password after logging in!', 400),
    );

  // Attach full user to request — downstream middleware and controllers use req.user.
  req.user = user;
  next();
});

// ── Role-based access ─────────────────────────────────────
// Returns middleware that only allows users whose role is in the provided list.
// Must run after `protect` since it reads req.user.role.
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role))
      return next(
        new AppError('You do not have permission to perform this act', 403),
      );
    next();
  };
};

// ── Forgot password ───────────────────────────────────────
// Generates a 6-digit reset code, saves it hashed to the user,
// and emails it. Does not expose whether the email exists (though
// the error message currently does a timing-safe generic message
// would be more secure in production.
exports.forgotPassword = catchAsync(async (req, res, next) => {
  const { email } = req.body;

  const user = await User.findOne({ email });

  if (!user)
    return next(new AppError('There is no user with this email!', 401));

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
    const emailFn = new Email(html, email, 'Reset your password!');
    await emailFn.send();
    res.status(200).json({
      status: 'success',
      message: 'Check your inbox!',
    });
  } catch (err) {
    console.log(err);
    return next(new AppError('Failed sending password reset email!', 500));
  }
});

// ── Reset code check ──────────────────────────────────────
// Verifies the 6-digit code is correct and not expired.
// Returns a short-lived reset token (10 min) with purpose: 'reset-password'
// so it cannot be used as a regular auth token.
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

// ── Reset token guard ─────────────────────────────────────
// Validates the short-lived reset token from resetCodeCheck.
// Attaches req.userId so resetPassword can use it instead of trusting req.body.email.
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

// ── Reset password ────────────────────────────────────────
// Updates the user's password after a verified reset flow.
exports.resetPassword = catchAsync(async (req, res, next) => {
  const { password, confirmPassword } = req.body;
  if (!password || !confirmPassword)
    return next(
      new AppError('You must enter the password and its confirmation!', 401),
    );

  const user = await User.findById(req.userId);
  if (!user)
    return next(new AppError('There is no user with this email!', 404));

  user.password = password;
  user.confirmPassword = confirmPassword;

  // Clear reset fields after use so the code cannot be reused.
  user.passwordResetCode = undefined;
  user.passwordResetExpires = undefined;
  user.passwordChangedAt = new Date(Date.now()).toISOString();

  await user.save();

  createSendToken(user, 'jwt', res);
});

// ── Google OAuth ──────────────────────────────────────────
// Initiates the Google OAuth flow — redirects to Google's consent screen.
exports.googleAuth = passport.authenticate('google', {
  scope: ['profile', 'email'],
});

// Handles Google's callback after the user approves.
// If the user exists with the same email, links the Google ID to their account.
// On success, redirects to FRONTEND_URL with the JWT as a query param.
// The frontend should extract the token from the URL and store it.
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
        // Google-authenticated users skip email verification.
        emailVerified: true,
      });
    } else if (!user.googleId) {
      // Existing local account — link the Google ID.
      user.googleId = googleUser.googleId;
      user.authProvider = 'google';
      user.emailVerified = true;
      await user.save();
    }

    const token = signToken(user._id);

    // Token is passed as a query param — the frontend must read and store it immediately.
    // Consider using a short-lived code exchange instead to avoid tokens in browser history.
    res.redirect(`${process.env.FRONTEND_URL}?token=${token}`);
  } catch (err) {
    next(err);
  }
};

// ── GitHub OAuth ──────────────────────────────────────────
// Same pattern as Google OAuth.
// NOTE: GitHub accounts without a public email will be rejected.
exports.githubAuth = passport.authenticate('github-auth');

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
});

exports.githubConnect = passport.authenticate('github-connect');
exports.githubConnectCallback = catchAsync(async (req, res, next) => {
  const { githubAccessToken, userId } = req.user;

  const user = await User.findById(userId).select('+githubAccessToken');
  user.githubAccessToken = githubAccessToken;
  await user.save({ validateBeforeSave: false });

  const token = signToken(user._id);

  res.redirect(`${process.env.FRONTEND_URL}`);
});
