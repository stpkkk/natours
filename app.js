const express = require('express');
const morgan = require('morgan');
const qs = require('qs');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('@exortek/express-mongo-sanitize');
const xssSanitize = require('xss-sanitize');
const hpp = require('hpp');
const cors = require('cors');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const AppError = require('./utils/AppError');
const globalErrorHandler = require('./controllers/errorController');
const cookieParser = require('cookie-parser');

const app = express();
app.set('query parser', (str) => qs.parse(str));

// Global MIDDLEWARES
// Implement CORS
app.use(cors());
// Access-Control-Allow-Origin *
// api.natours.com, front-end natours.com
// app.use(cors({
//   origin: 'https://www.natours.com'
// }))

app.options('/{*splat}', cors());
// app.options('/api/v1/tours/:id', cors());
// Set security HTTP headers
app.use(helmet());

// Development LOGging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Limit requests from same IP (ограничение на 100 запросов в час)
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many request from this IP, please try again in an hour!',
});

app.use('/api', limiter); // for routes starts with /api

// Body parser, reading data from body into req.body, and limit accepted body size
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xssSanitize());

// Prevent parameter pollution
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsQuantity',
      'ratingsAverage',
      'maxGroupSize',
      'difficulty',
      'price',
    ],
  }),
);

// Serving static files
app.use(express.static(`${__dirname}/public`));

// custom middleware
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

// MOUNT ROUTERS
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);

// Несуществующий роут
app.use((req, res, next) => {
  next(new AppError(404, `Cant find ${req.originalUrl} on server!`));
});

// Глобальный обработчик - должен быть ПОСЛЕДНИМ
app.use(globalErrorHandler);

module.exports = app;
