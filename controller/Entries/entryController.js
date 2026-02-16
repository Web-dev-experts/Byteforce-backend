const AppError = require('../../utils/AppError');
const Entry = require('../../model/Entries/entryModel');
const catchAsync = require('../../utils/catchAsync');
const User = require('../../model/User/userModel');
const LeagueUserProgress = require('../../model/Leagues/leagueUserProgress');
const LeagueSeason = require('../../model/Leagues/leagueSeasonModel');
const League = require('../../model/Leagues/leagueModel');
const Subscription = require('../../model/pricing/pricingModel');

exports.getMyEntry = catchAsync(async (req, res, next) => {
  const user = req.user._id;
  const entry = await Entry.findOne({ user, _id: req.params.entryId }).select(
    '-__v',
  );
  if (!entry)
    return next(new AppError('You currently have no entry with this ID!', 404));
  res.status(200).json({
    status: 'success',
    data: {
      entry,
    },
  });
});
exports.getAllMyEntries = catchAsync(async (req, res, next) => {
  const user = req.user._id;
  const entries = await Entry.find({ user }).select('-__v');
  if (entries.length === 0)
    return next(new AppError('You currently have no entries!', 404));
  res.status(200).json({
    status: 'success',
    length: entries.length,
    data: {
      entries,
    },
  });
});
exports.startEntry = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user._id);

  const entriesCount = await Entry.countDocuments({
    user: user._id,
  });
  const subscription = await Subscription.findById(user.subscription);
  if (subscription.maxEntries === entriesCount)
    return next(
      new AppError(
        `You have reached your ${subscription.name} plan entry limit! Upgrade your plan to create a new one`,
      ),
    );

  const entries = await Entry.find({ user: user._id, endDate: undefined });
  if (entries.length > 0)
    return next(
      new AppError(
        'There is already an entry running! Please end the previous one to create a new one',
        400,
      ),
    );
  const { title, description, type, activity } = req.body;

  const projectId = req.body?.projectId ? req.body.projectId : undefined;

  const entry = await Entry.create({
    user: user._id,
    projectId,
    title,
    description,
    type,
    activity,
  });

  res.status(200).json({
    status: 'success',
    data: {
      entry,
    },
  });
});
exports.endEntry = catchAsync(async (req, res, next) => {
  const user = req.user._id;
  const currentEntry = await Entry.findOne({ user, endDate: undefined });
  if (!currentEntry)
    return next(new AppError('There is no entry running currently!', 400));

  await currentEntry.finishEntry();
  res.status(200).json({
    status: 'success',
    data: {
      entry: currentEntry,
    },
  });
});
exports.deleteEntry = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user._id);
  const entry = await Entry.findOne({
    user: user._id,
    _id: req.params.entryId,
  }).select('+accepted');
  if (!entry) return next(new AppError('There is no entry with this ID!', 404));
  const userLeague = await League.findById(user.league);
  if (!userLeague) return;
  const runningSeason = await LeagueSeason.findOne({
    league: userLeague._id,
    status: 'running',
  });
  const leagueUserProgress = await LeagueUserProgress.findOne({
    user: entry.user,
    leagueSeason: runningSeason._id,
  });

  if (entry.status === 'finished' && entry.accepted) {
    user.XP -= entry.XPGranted;
    user.syntaxForces -= entry.SFGranted;
    leagueUserProgress.XP -= entry.XPGranted;
    leagueUserProgress.syntaxForces -= entry.SFGranted;
    await user.save({ validateBeforeSave: false });
    await leagueUserProgress.save({ validateBeforeSave: false });
    await Entry.deleteOne({ _id: req.params.entryId });
  }

  res.status(204).json({
    status: 'success',
    message: 'entry deleted!',
  });
});
exports.editEntry = catchAsync(async (req, res, next) => {
  const entry = await Entry.findOne({
    user: req.user._id,
    _id: req.params.entryId,
  });
  if (!entry) return next(new AppError('There is no entry with this ID!', 404));
  if (req.body.title) entry.title = req.body.title;
  if (req.body.description) entry.description = req.body.description;
  if (req.body.field) entry.field = req.body.field;
  await entry.save();
  res.status(200).json({
    status: 'success',
    message: 'entry updated!',
  });
});
