const AppError = require('../../utils/AppError');
const League = require('../../model/Leagues/leagueModel');
const UserHistory = require('../../model/Leagues/userSeasonHistory');
const LeagueSeason = require('../../model/Leagues/leagueSeasonModel');
const LeagueUserProgress = require('../../model/Leagues/leagueUserProgress');
const catchAsync = require('../../utils/catchAsync');
const User = require('../../model/User/userModel');

exports.getAllLeagues = catchAsync(async (req, res, next) => {
  const leagues = await League.find();
  res.status(200).json({
    status: 'success',
    data: {
      leagues,
    },
  });
});

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

exports.getArchiveLeaderboard = catchAsync(async (req, res, next) => {
  const { seasonName, seasonNumber } = req.params;
  if (!seasonName)
    return next(new AppError('You must precise the season name!', 404));
  const archive = await UserHistory.find({ seasonName, seasonNumber }).sort(
    '-finalSF',
  );
  if (!archive)
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

exports.getArchiveSeason = catchAsync(async (req, res, next) => {
  const { seasonName } = req.params;
  if (!seasonName)
    return next(new AppError('You must precise the season name!', 404));
  const archive = await UserHistory.find({ seasonName, user: req.user._id });
  if (!archive)
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

exports.getAllCurrentSeason = catchAsync(async (req, res, next) => {
  const currentSeasons = await LeagueSeason.find({
    status: 'running',
  });
  if (!currentSeasons)
    return next(new AppError('There is no season running', 404));

  res.status(200).json({
    status: 'success',
    data: {
      currentSeasons,
    },
  });
});

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
    user,
  });

  res.status(200).json({
    status: 'success',
    data: {
      userProgress,
    },
  });
});
