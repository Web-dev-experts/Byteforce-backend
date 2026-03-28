const User = require('../model/User/userModel');
const LeagueSeason = require('../model/Leagues/leagueSeasonModel');
const League = require('../model/Leagues/leagueModel');
const LeagueRules = require('../model/Leagues/leagueSeasonRulesModel');
const LeagueUserProgress = require('../model/Leagues/leagueUserProgress');
const UserHistory = require('../model/Leagues/userSeasonHistory');
const Quest = require('../model/Quests/questModel');
const QuestProgress = require('../model/Quests/questProgressModel');
const calcObjective = require('../utils/calculateObjective');
const year = new Date().getFullYear();

// ── Season schedule & promotion rules ────────────────────
// SEASONS is an object (not an array), so for...of will not work on it directly.
// seasonCron.js must use Object.keys(SEASONS) to iterate.
// promotionRank is the top-N% threshold — e.g. 50 means top 50% gets promoted.
// promotionSF and demotionSF are SyntaxForces thresholds for direct promotion/demotion.
// AetheriumIV has promotionSF: 15000 which is much lower than AetheriumIII's demotionSF:
// 100000 — this means a user can be demoted from AetheriumIV for having more SF
// than what it takes to get promoted there. Worth reviewing.
const SEASONS = {
  SeasonOne: {
    // Dec 1 (prev year) → Apr 20 (current year)
    startDate: new Date(Date.UTC(year, 0, 1)),
    endDate: new Date(Date.UTC(year, 2, 1)),
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
      },
    ],
  },
  SeasonTwo: {
    // Apr 20 → Jun 20
    startDate: new Date(Date.UTC(year, 2, 1)),
    endDate: new Date(Date.UTC(year, 4, 1)),
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
      },
    ],
  },
  SeasonThree: {
    // Jun 30 → Oct 21
    startDate: new Date(Date.UTC(year, 4, 1)),
    endDate: new Date(Date.UTC(year, 8, 1)),
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
      },
    ],
  },
  SeasonFour: {
    // Jun 30 → Oct 21
    startDate: new Date(Date.UTC(year, 8, 1)),
    endDate: new Date(Date.UTC(year, 11, 31)),
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
      },
    ],
  },
};
const OBJECTIVE_TYPES = [
  'XP',
  'syntaxForces',
  'rank',
  'entries',
  'level',
  'project',
  'battles',
  'war',
];
const REWARD_TYPE = ['XP', 'syntaxForces', 'coins'];
const FREQUENCIES = ['daily', 'seasonal'];

// ── createSeason(name) ────────────────────────────────────
// Called by seasonCron when today enters a season's date range.
// Creates one LeagueSeason per league, initializes LeagueUserProgress
// for every user in that league, then creates LeagueRules for each league.
//
// The two-pass approach (seasons first, rules second) is intentional:
// rules reference the LeagueSeason _id which must exist first.
//
// rank is initialized to users.length + 1 (last place) for all new users.
// recalculateRanks in the cron will correct this the next midnight run.
function pickRandom(array, count) {
  return [...array].sort(() => Math.random() - 0.5).slice(0, count);
}
async function createSeason(name) {
  const leagues = await League.find();

  await QuestProgress.deleteMany();
  await Quest.deleteMany();

  // First, create all LeagueSeasons and user progress sequentially
  for (const league of leagues) {
    const users = await User.find({ league: league._id });
    for (const objectiveType of OBJECTIVE_TYPES) {
      for (const frequency of FREQUENCIES) {
        const randomRewardType = REWARD_TYPE[Math.floor(Math.random() * 3)];
        const quest = await Quest.create({
          frequency,
          scope: 'global',
          objectiveType,
          rewardType: randomRewardType,
          league: league._id,
        });
      }
    }
    const leagueSeasonCount = await LeagueSeason.countDocuments({
      league: league._id,
    });

    const newSeason = await LeagueSeason.create({
      name,
      league: league._id,
      startDate: SEASONS[name].startDate,
      endDate: SEASONS[name].endDate,
      // seasonNumber = total historical seasons for this league (0-indexed)
      seasonNumber: leagueSeasonCount,
      bonus: SEASONS[name].bonus,
      status: 'running',
    });

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

  for (const league of leagues) {
    const users = await User.find({ league: league._id });
    const dailyQuests = await Quest.find({
      league: league._id,
      frequency: 'daily',
    });
    const seasonalQuests = await Quest.find({
      league: league._id,
      frequency: 'seasonal',
    });

    for (const user of users) {
      const pickedDaily = pickRandom(dailyQuests, 3);
      const pickedSeasonal = pickRandom(seasonalQuests, 5);

      for (const quest of [...pickedDaily, ...pickedSeasonal]) {
        await QuestProgress.create({
          quest: quest._id,
          user: user._id,
          progressType: quest.objectiveType,
        });
      }
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
        promotionRank: leagueData?.promotionRank,
        promotionSF: leagueData?.promotionSF,
        demotionSF: leagueData?.demotionSF,
      },
      // maxDaysSpent is hardcoded here — not taken from the season config.
      // If you want per-season or per-league control, add it to SEASONS.
      maxDaysSpent: 200,
    });
  }
}

// ── endSeason(seasonId, index) ────────────────────────────
// Called by seasonCron for each expired LeagueSeason.
// For each user in that season: determines promotion/demotion,
// updates the User's league, records UserHistory, deletes their
// LeagueUserProgress, and deletes all LeagueRules.
//
// index is the sequential number passed from the cron loop — used
// as seasonNumber in UserHistory. It is NOT the season's own seasonNumber.
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
  const nextLeague = await League.findOne({ order: league.order + 1 });
  const prevLeague = await League.findOne({ order: league.order - 1 });
  for (const userProgress of progresses) {
    const user = await User.findById(userProgress.user).populate('league');
    if (!user) continue;

    // best50Percent = the rank threshold above which a user qualifies for promotion.
    // e.g. if 100 users and promotionRank=50, best50Percent = 50 (top 50 users).
    const best50Percent = Math.floor(
      ((progresses.length + 1) * seasonRules.promotion?.promotionRank) / 100,
    );

    // Promotion: user qualifies if they meet the SF threshold OR are ranked high enough,
    // AND there is a next league to promote to.
    const promotion =
      nextLeague &&
      ((userProgress.syntaxForces >= seasonRules.promotion?.promotionSF &&
        userProgress.syntaxForces > 100) ||
        userProgress.rank <= best50Percent);

    // Demotion: user qualifies if SF is below the floor OR they were inactive too long,
    // AND there is a previous league to demote to. Bronze users cannot be demoted (prevLeague = null).
    const demotion =
      prevLeague &&
      (userProgress.syntaxForces < seasonRules.promotion?.demotionSF ||
        userProgress.daysActive >= seasonRules?.maxDaysSpent);

    // Promotion
    const lastHistory = await UserHistory.findOne({ user: user._id }).sort({
      createdAt: -1,
    });
    if (promotion) {
      user.league = nextLeague._id;
      const history = await UserHistory.create({
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
        highestLevel: lastHistory
          ? Math.max(user.level, lastHistory.highestLevel)
          : user.level,
        highestStreak: lastHistory
          ? Math.max(user.streak, lastHistory.highestStreak)
          : user.streak,
        highestLeague: lastHistory
          ? Math.max(league.order, lastHistory.highestLeague)
          : user.league.order,
      });
      user.highestLeague = history.highestLeague;
      user.highestLevel = history.highestLevel;
      user.highestStreak = history.highestStreak;
      await user.save({ validateBeforeSave: false });
      await LeagueUserProgress.findByIdAndDelete(userProgress._id);
      continue;
    }

    // Demotion
    if (demotion) {
      user.league = prevLeague._id;
      const history = await UserHistory.create({
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
        highestLevel: lastHistory
          ? Math.max(user.level, lastHistory.highestLevel)
          : user.level,
        highestStreak: lastHistory
          ? Math.max(user.streak, lastHistory.highestStreak)
          : user.streak,
        highestLeague: lastHistory
          ? Math.max(league.order, lastHistory.highestLeague)
          : user.league.order,
      });
      user.highestLeague = history.highestLeague;
      user.highestLevel = history.highestLevel;
      user.highestStreak = history.highestStreak;
      await user.save({ validateBeforeSave: false });
      await LeagueUserProgress.findByIdAndDelete(userProgress._id);
      continue;
    }

    // No promotion or demotion — user stays in their current league
    const history = await UserHistory.create({
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
      highestLevel: lastHistory
        ? user.level < lastHistory.highestLevel && lastHistory.highestLevel
        : user.level,
      highestStreak: lastHistory
        ? user.streak < lastHistory.highestStreak && lastHistory.highestStreak
        : user.streak,
      highestLeague: lastHistory
        ? user.league.name < lastHistory.highestLeague &&
          lastHistory.highestLeague
        : user.league.name,
    });
    user.highestLeague = history.highestLeague;
    user.highestLevel = history.highestLevel;
    user.highestStreak = history.highestStreak;
    await user.save({ validateBeforeSave: false });
    await LeagueUserProgress.findByIdAndDelete(userProgress._id);
    // WARNING: same unfiltered deleteMany issue.
  }
  await LeagueRules.deleteMany({ leagueSeason: currentSeason._id });

  // Finish season only after all users processed
  await LeagueSeason.findByIdAndDelete(currentSeason._id);
}

module.exports = {
  SEASONS,
  createSeason,
  endSeason,
};
