const LeagueSeason = require('./model/Leagues/leagueSeasonModel');
const League = require('./model/Leagues/leagueModel');
const LeagueRules = require('./model/Leagues/leagueSeasonRulesModel');
const LeagueUserProgress = require('./model/Leagues/leagueUserProgress');
const UserHistory = require('./model/Leagues/userSeasonHistory');
const crypto = require('crypto');
const User = require('./model/User/userModel');

const year = new Date().getFullYear();

const SEASONS = {
  Winter: {
    startDate: new Date(Date.UTC(year, 2, 21)),
    endDate: new Date(Date.UTC(year, 2, 21)),
    bonus: 0.1, // 10% bonus for this season
    leagues: [
      { name: 'Bronze', promotionSF: 25, promotionRank: 50, demotionSF: 0 },
      { name: 'Silver', promotionSF: 100, promotionRank: 40, demotionSF: 10 },
      { name: 'GoldI', promotionSF: 500, promotionRank: 30, demotionSF: 50 },
      {
        name: 'GoldII',
        promotionSF: 1000,
        promotionRank: 25,
        demotionSF: 100,
      },
      {
        name: 'CupriteI',
        promotionSF: 2000,
        promotionRank: 20,
        demotionSF: 200,
      },
      {
        name: 'CupriteII',
        promotionSF: 4000,
        promotionRank: 15,
        demotionSF: 400,
      },
      {
        name: 'CupriteIII',
        promotionSF: 8000,
        promotionRank: 10,
        demotionSF: 800,
      },
      {
        name: 'ObsidianI',
        promotionSF: 12000,
        promotionRank: 7,
        demotionSF: 1000,
      },
      {
        name: 'ObsidianII',
        promotionSF: 20000,
        promotionRank: 5,
        demotionSF: 2000,
      },
      {
        name: 'ObsidianIII',
        promotionSF: 30000,
        promotionRank: 3,
        demotionSF: 4000,
      },
      {
        name: 'DiamondI',
        promotionSF: 40000,
        promotionRank: 2,
        demotionSF: 6000,
      },
      {
        name: 'DiamondII',
        promotionSF: 50000,
        promotionRank: 1,
        demotionSF: 8000,
      },
      {
        name: 'DiamondIII',
        promotionSF: 60000,
        promotionRank: 1,
        demotionSF: 10000,
      },
      {
        name: 'UraniumI',
        promotionSF: 80000,
        promotionRank: 1,
        demotionSF: 12000,
      },
      {
        name: 'UraniumII',
        promotionSF: 100000,
        promotionRank: 1,
        demotionSF: 15000,
      },
      {
        name: 'UraniumIII',
        promotionSF: 120000,
        promotionRank: 1,
        demotionSF: 20000,
      },
      {
        name: 'AetheriumI',
        promotionSF: 150000,
        promotionRank: 1,
        demotionSF: 25000,
      },
      {
        name: 'AetheriumII',
        promotionSF: 300000,
        promotionRank: 1,
        demotionSF: 50000,
      },
      {
        name: 'AetheriumIII',
        promotionSF: 1000000,
        promotionRank: 1,
        demotionSF: 100000,
      },
      {
        name: 'AetheriumIV',
        promotionSF: 15000,
        promotionRank: 1,
        demotionSF: 10000,
      },
    ],
  },
  Spring: {
    startDate: new Date(Date.UTC(year, 2, 21)),
    endDate: new Date(Date.UTC(year, 2, 21)),
    bonus: 0.15,
    leagues: [
      { name: 'Bronze', promotionSF: 25, promotionRank: 50, demotionSF: 0 },
      { name: 'Silver', promotionSF: 100, promotionRank: 40, demotionSF: 10 },
      { name: 'GoldI', promotionSF: 500, promotionRank: 30, demotionSF: 50 },
      {
        name: 'GoldII',
        promotionSF: 1000,
        promotionRank: 25,
        demotionSF: 100,
      },
      {
        name: 'CupriteI',
        promotionSF: 2000,
        promotionRank: 20,
        demotionSF: 200,
      },
      {
        name: 'CupriteII',
        promotionSF: 4000,
        promotionRank: 15,
        demotionSF: 400,
      },
      {
        name: 'CupriteIII',
        promotionSF: 8000,
        promotionRank: 10,
        demotionSF: 800,
      },
      {
        name: 'ObsidianI',
        promotionSF: 12000,
        promotionRank: 7,
        demotionSF: 1000,
      },
      {
        name: 'ObsidianII',
        promotionSF: 20000,
        promotionRank: 5,
        demotionSF: 2000,
      },
      {
        name: 'ObsidianIII',
        promotionSF: 30000,
        promotionRank: 3,
        demotionSF: 4000,
      },
      {
        name: 'DiamondI',
        promotionSF: 40000,
        promotionRank: 2,
        demotionSF: 6000,
      },
      {
        name: 'DiamondII',
        promotionSF: 50000,
        promotionRank: 1,
        demotionSF: 8000,
      },
      {
        name: 'DiamondIII',
        promotionSF: 60000,
        promotionRank: 1,
        demotionSF: 10000,
      },
      {
        name: 'UraniumI',
        promotionSF: 80000,
        promotionRank: 1,
        demotionSF: 12000,
      },
      {
        name: 'UraniumII',
        promotionSF: 100000,
        promotionRank: 1,
        demotionSF: 15000,
      },
      {
        name: 'UraniumIII',
        promotionSF: 120000,
        promotionRank: 1,
        demotionSF: 20000,
      },
      {
        name: 'AetheriumI',
        promotionSF: 150000,
        promotionRank: 1,
        demotionSF: 25000,
      },
      {
        name: 'AetheriumII',
        promotionSF: 300000,
        promotionRank: 1,
        demotionSF: 50000,
      },
      {
        name: 'AetheriumIII',
        promotionSF: 1000000,
        promotionRank: 1,
        demotionSF: 100000,
      },
      {
        name: 'AetheriumIV',
        promotionSF: 15000,
        promotionRank: 1,
        demotionSF: 10000,
      },
    ],
  },
  Summer: {
    startDate: new Date(Date.UTC(year, 2, 21)),
    endDate: new Date(Date.UTC(year, 2, 21)),
    bonus: 0.2,
    leagues: [
      { name: 'Bronze', promotionSF: 25, promotionRank: 50, demotionSF: 0 },
      { name: 'Silver', promotionSF: 100, promotionRank: 40, demotionSF: 10 },
      { name: 'GoldI', promotionSF: 500, promotionRank: 30, demotionSF: 50 },
      {
        name: 'GoldII',
        promotionSF: 1000,
        promotionRank: 25,
        demotionSF: 100,
      },
      {
        name: 'CupriteI',
        promotionSF: 2000,
        promotionRank: 20,
        demotionSF: 200,
      },
      {
        name: 'CupriteII',
        promotionSF: 4000,
        promotionRank: 15,
        demotionSF: 400,
      },
      {
        name: 'CupriteIII',
        promotionSF: 8000,
        promotionRank: 10,
        demotionSF: 800,
      },
      {
        name: 'ObsidianI',
        promotionSF: 12000,
        promotionRank: 7,
        demotionSF: 1000,
      },
      {
        name: 'ObsidianII',
        promotionSF: 20000,
        promotionRank: 5,
        demotionSF: 2000,
      },
      {
        name: 'ObsidianIII',
        promotionSF: 30000,
        promotionRank: 3,
        demotionSF: 4000,
      },
      {
        name: 'DiamondI',
        promotionSF: 40000,
        promotionRank: 2,
        demotionSF: 6000,
      },
      {
        name: 'DiamondII',
        promotionSF: 50000,
        promotionRank: 1,
        demotionSF: 8000,
      },
      {
        name: 'DiamondIII',
        promotionSF: 60000,
        promotionRank: 1,
        demotionSF: 10000,
      },
      {
        name: 'UraniumI',
        promotionSF: 80000,
        promotionRank: 1,
        demotionSF: 12000,
      },
      {
        name: 'UraniumII',
        promotionSF: 100000,
        promotionRank: 1,
        demotionSF: 15000,
      },
      {
        name: 'UraniumIII',
        promotionSF: 120000,
        promotionRank: 1,
        demotionSF: 20000,
      },
      {
        name: 'AetheriumI',
        promotionSF: 150000,
        promotionRank: 1,
        demotionSF: 25000,
      },
      {
        name: 'AetheriumII',
        promotionSF: 300000,
        promotionRank: 1,
        demotionSF: 50000,
      },
      {
        name: 'AetheriumIII',
        promotionSF: 1000000,
        promotionRank: 1,
        demotionSF: 100000,
      },
      {
        name: 'AetheriumIV',
        promotionSF: 15000,
        promotionRank: 1,
        demotionSF: 10000,
      },
    ],
  },
  Autumn: {
    startDate: new Date(Date.UTC(year, 2, 21)),
    endDate: new Date(Date.UTC(year, 2, 21)),
    bonus: 0.05,
    leagues: [
      { name: 'Bronze', promotionSF: 25, promotionRank: 50, demotionSF: 0 },
      { name: 'Silver', promotionSF: 100, promotionRank: 40, demotionSF: 10 },
      { name: 'GoldI', promotionSF: 500, promotionRank: 30, demotionSF: 50 },
      {
        name: 'GoldII',
        promotionSF: 1000,
        promotionRank: 25,
        demotionSF: 100,
      },
      {
        name: 'CupriteI',
        promotionSF: 2000,
        promotionRank: 20,
        demotionSF: 200,
      },
      {
        name: 'CupriteII',
        promotionSF: 4000,
        promotionRank: 15,
        demotionSF: 400,
      },
      {
        name: 'CupriteIII',
        promotionSF: 8000,
        promotionRank: 10,
        demotionSF: 800,
      },
      {
        name: 'ObsidianI',
        promotionSF: 12000,
        promotionRank: 7,
        demotionSF: 1000,
      },
      {
        name: 'ObsidianII',
        promotionSF: 20000,
        promotionRank: 5,
        demotionSF: 2000,
      },
      {
        name: 'ObsidianIII',
        promotionSF: 30000,
        promotionRank: 3,
        demotionSF: 4000,
      },
      {
        name: 'DiamondI',
        promotionSF: 40000,
        promotionRank: 2,
        demotionSF: 6000,
      },
      {
        name: 'DiamondII',
        promotionSF: 50000,
        promotionRank: 1,
        demotionSF: 8000,
      },
      {
        name: 'DiamondIII',
        promotionSF: 60000,
        promotionRank: 1,
        demotionSF: 10000,
      },
      {
        name: 'UraniumI',
        promotionSF: 80000,
        promotionRank: 1,
        demotionSF: 12000,
      },
      {
        name: 'UraniumII',
        promotionSF: 100000,
        promotionRank: 1,
        demotionSF: 15000,
      },
      {
        name: 'UraniumIII',
        promotionSF: 120000,
        promotionRank: 1,
        demotionSF: 20000,
      },
      {
        name: 'AetheriumI',
        promotionSF: 150000,
        promotionRank: 1,
        demotionSF: 25000,
      },
      {
        name: 'AetheriumII',
        promotionSF: 300000,
        promotionRank: 1,
        demotionSF: 50000,
      },
      {
        name: 'AetheriumIII',
        promotionSF: 1000000,
        promotionRank: 1,
        demotionSF: 100000,
      },
      {
        name: 'AetheriumIV',
        promotionSF: 15000,
        promotionRank: 1,
        demotionSF: 10000,
      },
    ],
  },
};

async function createSeason(name) {
  const leagues = await League.find();

  // First, create all LeagueSeasons and user progress sequentially
  for (const league of leagues) {
    const leagueSeasonCount = await LeagueSeason.countDocuments({
      league: league._id,
    });

    const newSeason = await LeagueSeason.create({
      name,
      league: league._id,
      startDate: SEASONS[name].startDate,
      endDate: SEASONS[name].endDate,
      seasonNumber: leagueSeasonCount,
      bonus: SEASONS[name].bonus,
      status: 'running',
    });

    const users = await User.find({ league: league._id });
    for (const user of users) {
      await LeagueUserProgress.create({
        leagueSeason: newSeason._id,
        user: user._id,
        XP: 0,
        syntaxForces: 0,
        rank: users.length + 1,
        daysActive: 0,
      });
    }
  }

  // Now create LeagueRules sequentially — must be after LeagueSeasons exist
  for (const leagueData of SEASONS[name].leagues) {
    const league = await League.findOne({ name: leagueData.name });
    if (!league) continue;

    const newSeason = await LeagueSeason.findOne({
      league: league._id,
      status: 'running',
    });
    if (!newSeason) continue;

    await LeagueRules.create({
      leagueSeason: newSeason._id,
      promotion: {
        promotionRank: leagueData.promotionRank,
        promotionSF: leagueData.promotionSF,
        demotionSF: leagueData.demotionSF,
      },
      maxDaysSpent: 200,
    });
  }
}

async function endSeason(seasonId, index) {
  const currentSeason = await LeagueSeason.findById(seasonId);
  if (!currentSeason) return;

  const seasonRules = await LeagueRules.findOne({
    leagueSeason: currentSeason._id,
  });
  const league = await League.findById(currentSeason.league);
  const progresses = await LeagueUserProgress.find({
    leagueSeason: currentSeason,
  });
  for (const user of progresses) {
    const nextLeague = await League.findOne({ order: league.order + 1 });
    const prevLeague = await League.findOne({ order: league.order - 1 });

    const userProgress = await LeagueUserProgress.findOne({
      user: user.user,
      leagueSeason: seasonId,
    });
    if (!userProgress) continue;

    const best50Percent = Math.floor(
      ((progresses.length + 1) * seasonRules.promotion.promotionRank) / 100,
    );
    const promotion =
      nextLeague &&
      ((userProgress.syntaxForces >= seasonRules.promotion.promotionSF &&
        userProgress.syntaxForces > 100) ||
        userProgress.rank <= best50Percent);
    const demotion =
      prevLeague &&
      (userProgress.syntaxForces < seasonRules.promotion.demotionSF ||
        userProgress.daysActive >= seasonRules.maxDaysSpent);
    // Promotion
    if (promotion) {
      user.league = nextLeague._id;
      await user.save({ validateBeforeSave: false });
      await UserHistory.create({
        user: user._id,
        league: league._id,
        leagueSeason: currentSeason._id,
        seasonName: currentSeason.name,
        seasonNumber: index,
        leagueName: league.name,
        finalXP: userProgress.XP,
        finalSF: userProgress.syntaxForces,
        finalRank: userProgress.rank,
        promoted: Boolean(
          nextLeague &&
          ((userProgress.syntaxForces >= seasonRules.promotion.promotionSF &&
            userProgress.syntaxForces > 100) ||
            userProgress.rank <= best50Percent),
        ),
        demoted: Boolean(
          prevLeague &&
          (userProgress.syntaxForces < seasonRules.promotion.demotionSF ||
            userProgress.daysActive >= seasonRules.maxDaysSpent),
        ),
      });
      await LeagueSeason.findByIdAndDelete(currentSeason._id);
      await LeagueUserProgress.findByIdAndDelete(userProgress._id);
      await LeagueRules.deleteMany();
      continue;
    }

    // Demotion
    if (demotion) {
      user.league = prevLeague._id;
      await user.save({ validateBeforeSave: false });
      await UserHistory.create({
        user: user._id,
        league: league._id,
        leagueSeason: currentSeason._id,
        seasonName: currentSeason.name,
        seasonNumber: index,
        leagueName: league.name,
        finalXP: userProgress.XP,
        finalSF: userProgress.syntaxForces,
        finalRank: userProgress.rank,
        promoted: Boolean(
          nextLeague &&
          ((userProgress.syntaxForces >= seasonRules.promotion.promotionSF &&
            userProgress.syntaxForces > 100) ||
            userProgress.rank <= best50Percent),
        ),
        demoted: Boolean(
          prevLeague &&
          (userProgress.syntaxForces < seasonRules.promotion.demotionSF ||
            userProgress.daysActive >= seasonRules.maxDaysSpent),
        ),
      });
      await LeagueSeason.findByIdAndDelete(currentSeason._id);
      await LeagueUserProgress.findByIdAndDelete(userProgress._id);
      await LeagueRules.deleteMany();
      continue;
    }
    await UserHistory.create({
      user: user._id,
      league: league._id,
      leagueSeason: currentSeason._id,
      seasonName: currentSeason.name,
      seasonNumber: index,
      leagueName: league.name,
      finalXP: userProgress.XP,
      finalSF: userProgress.syntaxForces,
      finalRank: userProgress.rank,
      promoted: Boolean(promotion),
      demoted: Boolean(demotion),
    });
    await LeagueSeason.findByIdAndDelete(currentSeason._id);
    await LeagueUserProgress.findByIdAndDelete(userProgress._id);
    await LeagueRules.deleteMany();
  }

  // Finish season only after all users processed
  currentSeason.status = 'finished';
  await currentSeason.save({ validateBeforeSave: false });
  await console.log(`Season finished: ${currentSeason.name}`);
}

module.exports = {
  SEASONS,
  createSeason,
  endSeason,
};
