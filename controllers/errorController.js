const AppError = require('../utils/AppError');

const handleExpiredToken = () => new AppError(401, 'Token Expired!');
const handleVerifyToken = () =>
  new AppError(401, 'Invalid token, please login again');

const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;

  return new AppError(400, message);
};

const handleDuplicateFieldsDB = (err) => {
  const value = err.message.match(/(["'])(?:(?=(\\?))\2.)*?\1/);
  const message = `Duplicate field with value ${value}`;

  return new AppError(400, message);
};

const handleValidationsDB = (err) => {
  const errMessages = Object.values(err.errors).map((el) => el.message);
  const message = `Validations errors: ${errMessages.join('. ')} `;

  return new AppError(400, message);
};

const sendErrorProd = (err, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });

    // Programming or other unknown error: don't leak error details
  } else {
    // 1) Log error
    console.error('ERROR 💥', err);

    // 2) Send generic message
    res.status(500).json({
      status: 'error',
      message: 'Something went very wrong!',
    });
  }
};

const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'fail';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else if (process.env.NODE_ENV === 'production') {
    let error = { ...err, name: err.name, message: err.message };

    if (error.name === 'CastError') error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error.name === 'ValidationError') error = handleValidationsDB(error);
    if (error.name === 'JsonWebTokenError') error = handleVerifyToken();
    if (error.name === 'TokenExpiredError') error = handleExpiredToken();

    sendErrorProd(error, res);
  }
};
