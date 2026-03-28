const AppError = require('./AppError.js');
require('dotenv').config({ path: '../config.env' });

// ── DB error handlers ─────────────────────────────────────

// CastError: invalid ObjectId format (e.g. /api/leagues/not-an-id)
const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

// Duplicate key: email or other unique field already exists
const handleDuplicationDB = (err) => {
  const value = Object.values(err.keyValue)[0];
  const message = `Duplicated field value: ${value}, Please use another value!`;
  return new AppError(message, 400);
};

// Mongoose validation error: required fields missing, enum mismatch, etc.
const handleValidationDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);

  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, 400);
};

// ── JWT error handlers ────────────────────────────────────

// Invalid signature or malformed token
const handleJWTErr = () =>
  new AppError('Invalid token. Please log in again', 401);

// Token has expired (controlled by JWT_EXPIRES in config.env)
const handleJWTExpiredErr = () =>
  new AppError('Token expired. Please log in again', 401);

// ── Response formatters ───────────────────────────────────

// Development: expose everything including stack trace for debugging.
const sendErrDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
    stack: err.stack,
    err,
  });
};

// Production: only expose the message for operational errors.
// Non-operational errors (programmer bugs) return a generic 500.
const sendErrProd = (err, res) => {
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  } else {
    console.error('ERROR 💥', err);
    res.status(500).json({
      status: 'bug',
      message: 'something went wrong',
    });
  }
};

// ── Global error handler ──────────────────────────────────
// Express identifies this as an error handler by the 4-parameter signature.
// Must be the last middleware registered in app.js.
module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';
  if (process.env.NODE_ENV === 'development') sendErrDev(err, res);
  if (process.env.NODE_ENV === 'production') {
    let error = err;

    // preserve message
    error.message = err.message;

    // DB errors
    if (error.code === 11000) error = handleDuplicationDB(error);
    if (error.name === 'CastError') error = handleCastErrorDB(error);
    if (error.name === 'ValidationError') error = handleValidationDB(error);

    // JWT errors
    if (error.name === 'JsonWebTokenError') error = handleJWTErr();
    if (error.name === 'TokenExpiredError') error = handleJWTExpiredErr();

    sendErrProd(error, res);
  }
};
