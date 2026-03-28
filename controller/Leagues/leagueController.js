const User = require('../../model/User/userModel');
const AppError = require('../../utils/AppError');
const League = require('../../model/Leagues/leagueModel');
const UserHistory = require('../../model/Leagues/userSeasonHistory');
const LeagueSeason = require('../../model/Leagues/leagueSeasonModel');
const LeagueUserProgress = require('../../model/Leagues/leagueUserProgress');
const catchAsync = require('../../utils/catchAsync');
const LeagueRules = require('../../model/Leagues/leagueSeasonRulesModel');
const War = require('../../model/Leagues/leagueWars');
const Entry = require('../../model/Entries/entryModel');

// Returns all 20 leagues in DB order.
exports.getAllLeagues = catchAsync(async (req, res, next) => {
  const leagues = await League.find();
  res.status(200).json({
    status: 'success',
    data: {
      leagues,
    },
  });
});

// Returns a single league by its MongoDB _id.
exports.getLeagueById = catchAsync(async (req, res, next) => {
  const { leagueId } = req.params;
  const league = await League.findById(leagueId);
  if (!league)
    return next(new AppError('There is no league with this ID', 404));
  res.status(200).json({
    status: 'success',
    data: {
      league,
    },
  });
});

// Returns all user progress records for the currently running season
// of the requested league, sorted by syntaxForces descending.
// This is the live leaderboard.
exports.getLeaderboard = catchAsync(async (req, res, next) => {
  const { leagueName } = req.params;
  if (!leagueName)
    return next(new AppError('You must precise the league name!', 404));
  const league = await League.findOne({
    name: leagueName,
  });
  if (!league)
    return next(new AppError('There is no league with this name!!', 404));
  const leagueSeason = await LeagueSeason.findOne({
    league: league._id,
    status: 'running',
  });
  if (!leagueSeason)
    return next(new AppError('There is no season in this league!', 404));
  const usersProgress = await LeagueUserProgress.find({
    leagueSeason: leagueSeason._id,
  }).sort('-syntaxForces');

  res.status(200).json({
    status: 'success',
    data: {
      usersProgress,
    },
  });
});

// Returns the archived leaderboard for a past season by name and number.
exports.getArchiveLeaderboard = catchAsync(async (req, res, next) => {
  const { seasonName, seasonNumber } = req.params;
  if (!seasonName)
    return next(new AppError('You must precise the season name!', 404));
  const archive = await UserHistory.find({ seasonName, seasonNumber }).sort(
    '-finalSF',
  );

  res.status(200).json({
    status: 'success',
    data: {
      archive,
    },
  });
});

// Returns the authenticated user's own history for a named season.
exports.getArchiveSeason = catchAsync(async (req, res, next) => {
  const { seasonName } = req.params;
  if (!seasonName)
    return next(new AppError('You must precise the season name!', 404));
  const archive = await UserHistory.find({ seasonName, user: req.user._id });
  if (archive.length === 0)
    return next(
      new AppError('There is no archived season with this name!', 400),
    );

  res.status(200).json({
    status: 'success',
    data: {
      archive,
    },
  });
});

// Returns all currently running LeagueSeasons (one per league = 20 documents).
exports.getAllCurrentSeason = catchAsync(async (req, res, next) => {
  const currentSeasons = await LeagueSeason.find({
    status: 'running',
  });
  res.status(200).json({
    status: 'success',
    data: {
      currentSeasons,
    },
  });
});

// Returns the running season for the authenticated user's current league.
exports.getMyCurrentSeason = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const user = await User.findById(userId);
  if (!user) return next(new AppError('Could not find user', 404));
  const currentSeason = await LeagueSeason.findOne({
    league: user.league,
    status: 'running',
  });
  if (!currentSeason)
    return next(new AppError('There is no season running', 404));

  res.status(200).json({
    status: 'success',
    data: {
      currentSeason,
    },
  });
});

// Returns the authenticated user's LeagueUserProgress for their current season.
// This includes their XP, SF, rank, and daysActive for the running season.
exports.getUserProgress = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const user = await User.findById(userId);
  if (!user) return next(new AppError('Could not find user', 404));
  const currentSeason = await LeagueSeason.findOne({
    league: user.league,
    status: 'running',
  });
  if (!currentSeason)
    return next(new AppError('There is no season running', 404));
  const userProgress = await LeagueUserProgress.findOne({
    leagueSeason: currentSeason._id,
    user: user._id,
  });

  res.status(200).json({
    status: 'success',
    data: {
      userProgress,
    },
  });
});

exports.getUserStats = catchAsync(async function (req, res, next) {
  const user = await User.findById(req.user._id);
  const season = await LeagueSeason.findOne({
    league: user.league,
    status: 'running',
  });
  if (!season) return next(new AppError('No running season', 404));

  const userProgress = await LeagueUserProgress.findOne({
    user: user._id,
    leagueSeason: season._id,
  });
  if (!userProgress) return next(new AppError('No progress found', 404));

  const seasonRules = await LeagueRules.findOne({ leagueSeason: season._id });
  const allProgress = await LeagueUserProgress.find({
    leagueSeason: season._id,
  });

  const daysElapsed = Math.floor(
    (Date.now() - season.startDate) / (1000 * 60 * 60 * 24),
  );
  const daysRemaining = Math.floor(
    (season.endDate - Date.now()) / (1000 * 60 * 60 * 24),
  );
  const totalUsers = allProgress.length;

  const rankPercentile = ((totalUsers - userProgress.rank) / totalUsers) * 100;
  const sfToPromotion = Math.max(
    0,
    seasonRules.promotion.promotionSF - userProgress.syntaxForces,
  );
  const sfToDemotion = Math.max(
    0,
    userProgress.syntaxForces - seasonRules.promotion.demotionSF,
  );
  const avgSFPerDay = userProgress.syntaxForces / Math.max(daysElapsed, 1);
  const projectedSF = Math.floor(
    userProgress.syntaxForces + avgSFPerDay * daysRemaining,
  );
  const avgSF = Math.floor(
    allProgress.reduce((sum, p) => sum + p.syntaxForces, 0) / totalUsers,
  );
  const avgRank = Math.floor(
    allProgress.reduce((sum, p) => sum + p.rank, 0) / totalUsers,
  );
  const usersAbove = allProgress.filter(
    (p) => p.rank < userProgress.rank,
  ).length;
  const usersBelow = allProgress.filter(
    (p) => p.rank > userProgress.rank,
  ).length;

  const sfProgress = Math.min(
    1,
    userProgress.syntaxForces / Math.max(seasonRules.promotion.promotionSF, 1),
  );
  const rankProgress = Math.min(
    1,
    seasonRules.promotion.promotionRank / Math.max(userProgress.rank, 1),
  );
  const recentEntries = await Entry.countDocuments({
    user: user._id,
    endDate: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
  });
  const momentum = Math.min(1, recentEntries / 7);
  const timeProgress = Math.min(
    1,
    daysElapsed / Math.max(daysElapsed + daysRemaining, 1),
  );
  const promotionChance = Math.floor(
    (sfProgress * 0.4 +
      rankProgress * 0.3 +
      momentum * 0.2 +
      timeProgress * 0.1) *
      100,
  );

  const dailyStats = await Entry.aggregate([
    {
      $match: {
        user: user._id,
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

  const seasonHistory = await UserHistory.find({ user: user._id }).sort({
    createdAt: 1,
  });

  res.status(200).json({
    status: 'success',
    data: {
      currentSeason: {
        rank: userProgress.rank,
        rankPercentile: Math.floor(rankPercentile),
        syntaxForces: userProgress.syntaxForces,
        sfToPromotion,
        sfToDemotion,
        projectedSF,
        promotionChance,
        daysRemaining,
        usersAbove,
        usersBelow,
      },
      leagueAverage: { avgSF, avgRank },
      charts: {
        daily: dailyStats,
        seasonal: seasonHistory.map((h) => ({
          season: h.seasonName,
          XP: h.finalXP,
          SF: h.finalSF,
          rank: h.finalRank,
        })),
      },
    },
  });
});

exports.declareWar = catchAsync(async function (req, res, next) {
  const challenger = req.user;
  const opponentId = req.params.userId;
  const opponent = await User.findById(opponentId);
  if (!opponent) return next(new AppError('You have to secify an opponent'));

  await War.create({
    challenger: challenger._id,
    opponent: opponentId,
  });

  opponent.warRequest.from = challenger._id;
  await opponent.save();

  res.status(200).json({
    status: 'success',
    message: `Request sent to ${opponent.name}`,
  });
});

exports.warDecision = catchAsync(async function (req, res, next) {
  const decision = req.params.decision;
  if (decision !== 'accepted' && decision !== 'rejected')
    return next(new AppError('Decision must be accepted or rejected!'));
  const userId = req.user._id;
  const user = await User.findById(userId);
  const opponent = await User.findById(user.warRequest.from);
  if (!opponent) return next(new AppError('There is no opponent!'));
  const war = await War.findOne({ challenger: opponent._id });
  if (!war) return next(new AppError('There is no war!'));

  user.warRequest.decision = decision;
  war.request = decision;
  await user.save();
  await war.save();
  res.status(200).json({
    status: 'success',
    message: `War request ${decision}. ${decision === 'accepted' ? 'War has been declared!' : 'The war will not occur!'}`,
  });
});
