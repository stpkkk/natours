const express = require('express');
const router = express.Router();
const tourController = require('../controllers/tourController');
const authController = require('../controllers/authController');
const reviewRouter = require('../routes/reviewRoutes');

// ---- Nested routes
//POST /tours/:tourId/reviews
//GET /tours/:tourId/reviews
//GET /tours/:tourId/reviews/:reviewId

// router
//   .route('/:tourId/reviews')
//   .post(
//     authController.protect,
//     authController.restrictTo('user'),
//     reviewController.createReview,
//   ); better solution -->

router.use('/:tourId/reviews', reviewRouter);

// ----

// если в url запроса есть id то вызываем checkID
// router.param('id', tourController.checkID); метод удален в процессе

router
  .route('/top-5-cheap')
  .get(tourController.aliasTopTours, tourController.getTours); //route кот использует middleware с использованием дефолтных параметров в url

//! эта тема относится к Mongo db, в postgres  это реализуется в SQL
router.route('/tour-stats').get(tourController.getTourStats);

//! эта тема относится к Mongo db, в postgres  это реализуется в SQL
router
  .route('/monthly-plan/:year')
  .get(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide', 'guide'),
    tourController.getMonthlyPlan,
  );

router
  .route('/')
  .get(tourController.getTours)
  .post(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.createTour,
  );

router
  .route('/:id')
  .get(tourController.getTour)
  .patch(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.uploadTourImages,
    tourController.resizeTourImages,
    tourController.updateTour,
  )
  .delete(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.deleteTour,
  );

module.exports = router;
