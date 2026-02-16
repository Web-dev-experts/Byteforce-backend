const AppError = require('../../utils/AppError');
const Subscription = require('../../model/pricing/pricingModel');
const catchAsync = require('../../utils/catchAsync');

exports.createSubscription = catchAsync(async (req, res, next) => {
  const {
    name,
    price,
    currency,
    interval,
    maxProjects,
    maxEntries,
    XPBonus,
    streakFreeze,
    stripePriceId,
  } = req.body;
  const pricing = await Subscription.create({
    name,
    price,
    currency,
    interval,
    maxProjects,
    maxEntries,
    XPBonus,
    streakFreeze,
    stripePriceId,
  });
  res.status(201).json({
    status: 'success',
    data: {
      pricing,
    },
  });
});

exports.updateSubscription = catchAsync(async (req, res, next) => {
  const { pricingId } = req.params;
  const {
    name,
    price,
    currency,
    interval,
    maxProjects,
    maxEntries,
    XPBonus,
    streakFreeze,
  } = req.body;
  const pricing = await Subscription.findById(pricingId);

  if (!pricing)
    return next(new AppError('There is no subscription with this ID', 401));

  if (name) pricing.name = name;
  if (price) pricing.price = price;
  if (currency) pricing.currency = currency;
  if (interval) pricing.interval = interval;
  if (maxProjects) pricing.maxProjects = maxProjects;
  if (maxEntries) pricing.maxEntries = maxEntries;
  if (XPBonus) pricing.XPBonus = XPBonus;
  if (streakFreeze) pricing.streakFreeze = streakFreeze;

  await pricing.save();
  res.status(200).json({
    status: 'success',
    data: {
      pricing,
    },
  });
});

exports.deleteSubscription = catchAsync(async (req, res, next) => {
  const { pricingId } = req.params;
  await Subscription.findByIdAndDelete(pricingId);
  res.status(204).json({
    status: 'success',
    message: 'deleted',
  });
});

exports.getAllPricing = catchAsync(async (req, res, next) => {
  const pricing = await Subscription.find();
  res.status(200).json({
    status: 'success',
    data: {
      pricing,
    },
  });
});

exports.getPricing = catchAsync(async (req, res, next) => {
  const { pricingId } = req.params;
  const pricing = await Subscription.findById(pricingId);
  if (!pricing)
    return next(new AppError('There is no subscription with this ID', 401));
  res.status(200).json({
    status: 'success',
    data: {
      pricing,
    },
  });
});