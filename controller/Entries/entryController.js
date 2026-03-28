const AppError = require('../../utils/AppError');
const User = require('../../model/User/userModel');
const Entry = require('../../model/Entries/entryModel');
const catchAsync = require('../../utils/catchAsync');
const LeagueUserProgress = require('../../model/Leagues/leagueUserProgress');
const LeagueSeason = require('../../model/Leagues/leagueSeasonModel');
const League = require('../../model/Leagues/leagueModel');
const Subscription = require('../../model/pricing/pricingModel');

// ── Get single entry ──────────────────────────────────────
// Scoped to req.user — users can only fetch their own entries.
exports.getMyEntry = catchAsync(async (req, res, next) => {
  const user = req.user._id;
  const entry = await Entry.findOne({ user, _id: req.params.entryId })
    .select('-__v')
    .populate('user projectId', 'name -_id');
  if (!entry)
    return next(new AppError('You currently have no entry with this ID!', 404));
  res.status(200).json({
    status: 'success',
    data: {
      entry,
    },
  });
});

// ── Get all entries ───────────────────────────────────────
// Returns all entries for the authenticated user.
exports.getAllMyEntries = catchAsync(async (req, res, next) => {
  const user = req.user._id;
  const entries = await Entry.find({ user }).select('-__v');
  res.status(200).json({
    status: 'success',
    length: entries.length,
    data: {
      entries,
    },
  });
});

// ── Start entry ───────────────────────────────────────────
// Creates a new entry in 'started' state.
// Checks: subscription entry limit, no concurrent open entry.
// Open entry is detected by the absence of an endDate field.
exports.startEntry = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user._id);

  const entriesCount = await Entry.countDocuments({
    user: user._id,
  });
  const subscription = await Subscription.findById(user.subscription);
  if (!subscription)
    return next(new AppError('You are not linked to any subscription!', 404));
  // Uses <= to block creation when the limit is exactly reached or exceeded.
  if (subscription.maxEntries <= entriesCount)
    return next(
      new AppError(
        `You have reached your ${subscription.name} plan entry limit! Upgrade your plan to create a new one`,
      ),
    );

  // An entry is "open" when it has no endDate.
  // $exists: false is more explicit than querying for undefined.
  const entries = await Entry.find({
    user: user._id,
    endDate: { $exists: false },
  });
  if (entries.length > 0)
    return next(
      new AppError(
        'There is already an entry running! Please end the previous one to create a new one',
        400,
      ),
    );
  const { title, description, type, activity, repoUrl } = req.body;

  // projectId is optional — only included for 'project' type entries.
  const projectId = req.body?.projectId ? req.body.projectId : undefined;

  const entry = await Entry.create({
    user: user._id,
    projectId,
    title,
    description,
    type,
    activity,
    repoUrl,
  });

  res.status(200).json({
    status: 'success',
    data: {
      entry,
    },
  });
});

// ── End entry ─────────────────────────────────────────────
// Finds the currently open entry and delegates to finishEntry().
// All XP/SF calculation, validation, and DB updates happen in the model method.
exports.endEntry = catchAsync(async (req, res, next) => {
  const user = req.user._id;
  // Open entry identified by missing endDate.
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

// ── Delete entry ──────────────────────────────────────────
// Reverses the XP/SF granted by a finished, accepted entry before deleting.
exports.deleteEntry = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user._id);
  const entry = await Entry.findOne({
    user: user._id,
    _id: req.params.entryId,
  }).select('+accepted');
  if (!entry) return next(new AppError('There is no entry with this ID!', 404));
  const userLeague = await League.findById(user.league);
  if (!userLeague)
    return next(
      new AppError('The user is currently not assigned to any league'),
    );
  const runningSeason = await LeagueSeason.findOne({
    league: userLeague._id,
    status: 'running',
  });
  if (!runningSeason)
    return next(new AppError('There is no season currently running!'));
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

// ── Edit entry ────────────────────────────────────────────
// Only allows editing cosmetic fields (title, description, field).
// XP, SF, type, activity, and dates cannot be changed after creation.
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

exports.getDailyStats = catchAsync(async function (req, res, next) {
  const userLeague = await League.findById(req.user.league);
  const season = await LeagueSeason.findOne({
    league: userLeague._id,
    status: 'running',
  });
  const dailyStats = await Entry.aggregate([
    {
      $match: {
        user: req.user._id,
        endDate: { $gte: season.startDate, $lte: season.endDate },
        status: 'finished',
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$endDate' } },
        dailyXP: { $sum: '$XPGranted' },
        dailySF: { $sum: '$SFGranted' },
        dailyEntries: { $sum: 1 },
        dailyDuration: { $sum: '$duration' },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      dailyStats,
    },
  });
});
