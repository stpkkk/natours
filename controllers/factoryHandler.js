const asyncCatch = require('../utils/asyncCatch');
const AppError = require('../utils/AppError');
const APIFeatures = require('./../utils/apiFeatures');

exports.createOne = (Model) =>
  asyncCatch(async (req, res, next) => {
    const newTour = await Model.create(req.body);

    res.status(201).json({
      status: 'success',
      data: {
        data: newTour,
      },
    });
  });

exports.getAll = (Model, populateOptions) =>
  asyncCatch(async (req, res, next) => {
    // To allow for nested GET reviews on tour (hack)
    let filter = {};
    if (req.params.tourId) filter = { tour: req.params.tourId };

    let query = Model.find(filter);
    if (populateOptions) query = query.populate(populateOptions);

    const features = new APIFeatures(query, req.query)
      .filter()
      .sort()
      .limit()
      .paginate();
    // const doc = await features.query.explain();
    const doc = await features.query;

    // SEND RESPONSE
    res.status(200).json({
      status: 'success',
      results: doc.length,
      data: {
        data: doc,
      },
    });
  });

exports.getOne = (Model, populateOptions) =>
  asyncCatch(async (req, res, next) => {
    let query = Model.findById(req.params.id);

    if (populateOptions) {
      query = query.populate(populateOptions);
    }

    const doc = await query;

    if (!doc) {
      return next(new AppError(404, 'Doc with this ID not found'));
    }

    res.status(200).json({
      status: 'success',
      data: { doc },
    });
  });

exports.updateOne = (Model) =>
  asyncCatch(async (req, res, next) => {
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      returnDocument: 'after', // вернёт обновлённую запись
      runValidators: true,
    });

    if (!doc) {
      return next(new AppError(404, 'Doc with this ID not found'));
    }

    res.status(200).json({
      status: 'success',
      data: {
        data: doc,
      },
    });
  });

exports.deleteOne = (Model) =>
  asyncCatch(async (req, res, next) => {
    const doc = await Model.findByIdAndDelete(req.params.id);

    if (!doc) {
      return next(new AppError(404, 'Doc with this ID not found'));
    }

    res.status(204).json({
      status: 'success',
      data: null,
    });
  });
