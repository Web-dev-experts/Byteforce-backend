const AppError = require('./AppError.js');
require('dotenv').config({ path: '../config.env' });

// DB ERRORS HANDLING
const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

const handleDuplicationDB = (err) => {
  const value = Object.values(err.keyValue)[0];
  const message = `Duplicated field value: ${value}, Please use another value!`;
  return new AppError(message, 400);
};

const handleValidationDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);

  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, 400);
};

// JWT ERRORS HANDLING
const handleJWTErr = () =>
  new AppError('Invalid token. Please log in again', 401);

const handleJWTExpiredErr = () =>
  new AppError('Token expired. Please log in again', 401);

// DEV ERROR HANDLER
const sendErrDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
    stack: err.stack,
    err,
  });
};

// PROD ERROR HANDLER
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

// GLOBAL ERROR HANDLER

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
