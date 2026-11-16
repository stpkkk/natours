const User = require('../models/userModel');
const asyncCatch = require('../utils/asyncCatch');
const AppError = require('../utils/AppError');
const factory = require('../controllers/factoryHandler');
const multer = require('multer');
const sharp = require('sharp');

// ---- upload file only for UPDATE ME (CURRENT USER)
// const multerStorage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, 'public/img/users');
//   },
//   filename: (req, file, cb) => {
//     const ext = file.mimetype.split('/')[1];
//     cb(null, `user-${req.user.id}-${Date.now()}.${ext}`);
//   },
// });

// хранится в буфере, для sharp библиотеки
const multerStorage = multer.memoryStorage();

// Only images
const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an image! Please upload only images.', 400), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

const filterObj = function (obj, ...allowedFields) {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });

  return newObj;
};

exports.uploadUserPhoto = upload.single('photo'); //'photo' - db field name there img os stored
exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

exports.resizeUserPhoto = asyncCatch(async (req, res, next) => {
  if (!req.file) return next();

  req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`;

  await sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/users/${req.file.filename}`);

  next();
});

// ----

exports.updateMe = asyncCatch(async (req, res, next) => {
  // 1. Create error if user POSTs password data
  if (req.body.password || req.body.confirmPassword) {
    return next(
      new AppError(
        400,
        'This route is not for password updates. Please use /update-password',
      ),
    );
  }

  // 2. Filtered out unwanted fields names that are not allowed to be updated
  // body.role: 'admin' is nor allowed
  const filteredBody = filterObj(req.body, 'name', 'email');
  if (req.file) filteredBody.photo = req.file.filename;

  // 3. Update user document
  const updateUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    // доп опции mongoose
    new: true, // вернет обновленную запись
    runValidators: true, // сделает валидацию по схеме перед добавлением в бд
  });

  res.status(200).json({
    status: 'success',
    data: { user: updateUser },
  });
});

exports.deleteMe = asyncCatch(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

exports.createUser = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: 'This route is not defined! Please use / signup instead',
  });
};
exports.getAllUsers = factory.getAll(User);
exports.getUser = factory.getOne(User);
exports.updateUser = factory.updateOne(User); // Do NOT change PASSWORDS with this!
exports.deleteUser = factory.deleteOne(User);
