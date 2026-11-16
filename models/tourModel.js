const mongoose = require('mongoose');
const slugify = require('slugify');
const validator = require('validator');

const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A tour must have a name'],
      unique: true,
      trim: true,
      maxlength: [40, 'A tour name must have less or equal then 40 characters'],
      minlength: [10, 'A tour name must have more or equal then 10 characters'],
      // validate: [validator.isAlpha, 'Tour name must only contain characters'],
    },
    slug: String,
    duration: {
      type: Number,
      required: [true, 'A tour must have a duration'],
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A tour must have a group size'],
    },
    difficulty: {
      type: String,
      required: [true, 'A tour must have a difficulty'],
      enum: {
        values: ['easy', 'medium', 'difficult'],
        message: 'Difficulty is either: easy, medium, difficult',
      },
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, 'Rating must be above 1.0'],
      max: [5, 'Rating must be below 5.0'],
      set: (val) => Math.round(val * 10) / 10,
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      required: [true, 'A tour must have a price'],
    },
    priceDiscount: {
      type: Number,
      validate: {
        validator: function (val) {
          // this only points to current doc on NEW document creation
          return val < this.price;
        },
        message: 'Discount price ({VALUE}) should be below regular price',
      },
    },
    summary: {
      type: String,
      trim: true,
      required: [true, 'A tour must have a description'],
    },
    description: {
      type: String,
      trim: true,
    },
    imageCover: {
      type: String,
      required: [true, 'A tour must have a cover image'],
    },
    images: [String],
    createdAt: {
      type: Date,
      default: Date.now(),
      // select: false, // не отправлять поле
    },
    startDates: [Date],
    slug: String,
    secretTour: {
      type: Boolean,
      default: false,
    },
    // Add at 150 lesson. Data Modeling. Только для MongoDB
    startLocation: {
      // GeoJSON
      type: {
        type: String,
        default: 'Point',
        enum: ['Point'],
      },
      coordinates: [Number],
      address: String,
      description: String,
    },
    // Add at 150 lesson. Data Modeling. Только для MongoDB
    locations: [
      {
        type: {
          type: String,
          default: 'Point',
          enum: ['Point'],
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number,
      },
    ],
    // referencing!
    guides: [{ type: mongoose.Schema.ObjectId, ref: 'User' }],
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

tourSchema.virtual('durationWeeks').get(function () {
  return this.duration / 7;
});

tourSchema.index({ price: 1, ratingsAverage: -1 });
tourSchema.index({ slug: 1 });

// Virtual populate
tourSchema.virtual('reviews', {
  ref: 'Review', // в какой модели искать
  foreignField: 'tour', // поле в Review, где лежит id тура
  localField: '_id', // поле в Tour, с которым сравниваем
});

// * 1 Document MIDDLEWARE: runs before .save() and .create() command
tourSchema.pre('save', function () {
  // console.log(this); // доступ к модели перед тем как сохраняется в БД
  this.slug = slugify(this.name, { lower: true });
});

// Не работает при update, заменим потом на referencing в БД
// tourSchema.pre('save', async function (next) {
//   // 1. Для каждого id делаем запрос к базе и получаем пользователя
//   const guidesPromises = this.guides.map(async (id) => await User.findById(id));

//   // 2. Ждём, пока выполнятся все запросы одновременно
//   this.guides = await Promise.all(guidesPromises);

//   next();
// });

tourSchema.post('save', function (doc) {
  // console.log(doc); // доступ к документу перед тем как сохраняется в БД
});

// * 2 QUERY MIDDLEWARE
tourSchema.pre(/^find/, function () {
  this.find({ secretTour: { $ne: true } });

  this.start = Date.now();
}); // строка regex, обрабатывает все методы mongoose кот начинаются с find, чтобы не писать для каждого метода этот MIDDLEWARE

tourSchema.pre(/^find/, function () {
  this.populate({
    path: 'guides',
    select: '-__v -passwordCVhangedAt',
  });
});

tourSchema.post(/^find/, function (docs) {
  console.log(`Query took ${Date.now() - this.start} milliseconds!`);
  // console.log(docs);
});

// * 3 AGGREGATION MIDDLEWARE
tourSchema.pre('aggregate', function () {
  this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });

  // console.log(this.pipeline());
});

const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;
