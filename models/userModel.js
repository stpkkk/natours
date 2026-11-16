const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please tell us ur name'],
  },
  email: {
    type: String,
    required: [true, 'Please provide ur email'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Please provide a valid email'],
  },
  role: {
    type: String,
    enum: ['user', 'guide', 'lead-guid', 'admin'],
    default: 'user',
  },
  photo: {
    type: String,
    default: 'default.jpg',
  },
  password: {
    type: String,
    required: [true, 'Pleas provide a password'],
    minLength: 8,
    select: false,
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Please confirm password'],
    select: false,
    validate: {
      // This only works on SAVE and CREATE!
      validator: function (el) {
        return el === this.password;
      },
      message: 'Passwords are not the same!',
    },
  },
  passwordChangeAt: {
    type: Date,
  },
  active: {
    type: Boolean,
    default: true,
    select: false,
  },
  passwordResetToken: String,
  passwordResetExpires: Date,
});

// userSchema.pre('save', async function () {
//   if (!this.isModified('password')) return;

//   this.password = await bcrypt.hash(this.password, 12); //12 - сложность шифрования
//   this.passwordConfirm = undefined;
// });

// userSchema.pre('save', async function () {
//   if (!this.isModified('password') || this.isNew) return;

//   this.passwordChangeAt = Date.now() - 1000;
// });

userSchema.pre(/^find/, async function () {
  // if(this.find())
});

// 'pass12345 === '$2b$12$W1a40GuVKmcUFTdCNvZd9GA3woxWfHMBTVP1UC'
userSchema.methods.isCorrectPassword = async function (
  candidatePassword,
  userPassword,
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

// Check if user change password after the token was issued
userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangeAt) {
    const changedTimestamp = parseInt(
      this.passwordChangeAt.getTime() / 1000,
      10,
    );

    return JWTTimestamp < changedTimestamp;
  }

  // False means NOT changed
  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
