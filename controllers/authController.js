const { promisify } = require('util');
const User = require('../models/userModel');
const AppError = require('../utils/AppError');
const asyncCatch = require('../utils/asyncCatch');
const jwt = require('jsonwebtoken');
const sendEmail = require('../utils/email');
const crypto = require('crypto');

const createSendToken = function (user, statusCode, res) {
  const token = signToken(user._id);
  const cookieOptions = {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true, // это настройка cookie, которая запрещает JavaScript на стороне браузера читать эту cookie через document.cookie.
  };
  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;
  res.cookie('jwt', 'loggedout', cookieOptions);

  //Remove the password from the output
  user.password = undefined;

  res.status(statusCode).json({
    token,
    status: 'success',
    data: { user },
  });
};

const signToken = function (id) {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE_IN,
  });
};

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(403, 'You do not have permission to perform this action'),
      );
    }
    next();
  };
};

exports.signup = asyncCatch(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    role: req.body.role,
  });

  // _id с таким именем генерируется id в mongo

  createSendToken(newUser, 201, res);
});

exports.login = asyncCatch(async (req, res, next) => {
  const { email, password } = req.body;
  // 1. check if the user email and password exist
  if (!email || !password) {
    return next(new AppError(400, 'Please provide email and password!'));
  }

  // 2. Check if user exist and password is correct
  // Ищем пользователя по email тк он уникальный
  const user = await User.findOne({ email }).select('+password'); //password mongo syntax

  if (!user || !(await user.isCorrectPassword(password, user.password))) {
    return next(new AppError(401, 'Incorrect email or password'));
  }

  //3. Is everything is ok, send token to client
  createSendToken(user, 200, res);
});

exports.logout = asyncCatch(async (req, res, next) => {
  res.cookie('jwt', 'dummytexttoresettoken', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status(200).json({ status: 'success' });
});

exports.protect = asyncCatch(async (req, res, next) => {
  // 1.Get token and check if token exist
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(
      new AppError(401, 'Please Authorize to get access for this route!'),
    );
  }

  // 2. Token verification(validation)
  // promisify оборачивает функцию
  const verifyAsync = promisify(jwt.verify);
  // теперь можно await
  const decoded = await verifyAsync(token, process.env.JWT_SECRET);

  // 3. Check if user exist
  const currentUser = await User.findById(decoded.id);

  if (!currentUser) {
    return next(new AppError(401, 'The user with this token no longer exist!'));
  }

  // 4. Check if user change password after the token was issued
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError(401, 'User recently change password! Please login again!'),
    );
  }

  // Access to protected route
  req.user = currentUser;
  next();
});

exports.forgotPassword = asyncCatch(async (req, res, next) => {
  if (!req.body || !req.body.email) {
    return next(new AppError(400, 'Please provide your email address!'));
  }
  //1. Get user based on POSTed email
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    return next(new AppError(404, 'There is no user with email address'));
  }

  //2. Generate random reset token
  const resetToken = user.createPasswordResetToken();

  await user.save({ validateBeforeSave: false }); // mongoose rule

  //3. Send it to user email
  const resetURL = `${req.protocol}://${req.get(
    'host',
  )}/api/v1/users/resetPassword/${resetToken}`;

  const message = `Forgot your password? Submit a PATCH request with your new password and passwordConfirm to: ${resetURL}.\nIf you didn't forget your password, please ignore this email!`;

  try {
    await sendEmail({
      email: user.email,
      subject: 'Your password reset token (valid for 10 min)',
      message,
    });

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email!',
    });
  } catch (err) {
    console.error('Ошибка отправки письма:', err);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError(
        500,
        'There was an error sending the email. Try again later!',
      ),
    );
  }
});

exports.resetPassword = asyncCatch(async (req, res, next) => {
  // 1) Get user based on the token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token) // из url запроса
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  // 2) If token has not expired, and there is user, set the new password
  if (!user) {
    return next(new AppError(400, 'Token is invalid or has expired'));
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  // 3) Update changedPasswordAt property for the user in userModel middleware
  // 4) Log the user in, send JWT
  createSendToken(user, 200, res);
});

exports.updateMyPassword = asyncCatch(async (req, res, next) => {
  // 1) get user from collection
  const user = await User.findById(req.user.id).select('+password');

  if (!user) {
    return next(new AppError(404, 'There is no user with email address'));
  }

  // 2) check if POSted current password is correct
  if (
    !(await user.isCorrectPassword(req.body.passwordCurrent, user.password))
  ) {
    return next(new AppError(401, 'Your current password is wrong!'));
  }

  // 3) If so, update password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();

  // 4) Log user in, send JWT
  createSendToken(user, 200, res);
});
