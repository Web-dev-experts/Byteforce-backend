const User = require('../model/User/userModel');
const { createSeason, endSeason, SEASONS } = require('../config/handleSeason');
const League = require('../model/Leagues/leagueModel');
const LeagueSeason = require('../model/Leagues/leagueSeasonModel');
const LeagueUserProgress = require('../model/Leagues/leagueUserProgress');
const Entry = require('../model/Entries/entryModel');
const QuestProgress = require('../model/Quests/questProgressModel');
const Quest = require('../model/Quests/questModel');
const Battle = require('../model/Leagues/leagueBattles');
const { endBattles, startBattles } = require('../config/handleBattles');
const { endWars, warRequest } = require('../config/handleWars');
const cron = require('node-cron');

function pickRandom(array, count) {
  return [...array].sort(() => Math.random() - 0.5).slice(0, count);
}

function runCron() {
  // '0 0 * * *' = run at 00:00 server time every day.
  // Server timezone affects when this fires — ensure the server runs in UTC.
  cron.schedule('0 0 * * *', async () => {
    try {
      // midnight = start of today (00:00:00)
      const midnight = new Date();
      midnight.setHours(0, 0, 0, 0);
      // todayMidnight = end of today (23:59:59)
      const todayMidnight = new Date();
      todayMidnight.setHours(23, 59, 59, 0);
      const today = new Date();

      // Load all users and leagues up front.
      await warRequest();
      const users = await User.find();
      const leagues = await League.find();
      await endBattles();
      await endWars();
      await Quest.deleteMany({ frequency: 'daily' });
      for (const league of leagues) {
        await startBattles(league._id);
        const leagueUsers = await User.find({ league: league._id });
        const quests = await Quest.find({
          frequency: 'daily',
          league: league._id,
        });
        for (const user of leagueUsers) {
          const randomQuests = pickRandom(quests, 3);
          for (const quest of randomQuests) {
            await QuestProgress.create({
              quest: quest._id,
              user: user._id,
              progressType: quest.objectiveType,
            });
          }
        }
      }

      // Recalculate ranks for every league's current season.
      for (const league of leagues) {
        const runningSeason = await LeagueSeason.findOne({
          league: league,
          status: 'running',
        });
        if (!runningSeason) continue;
        await LeagueUserProgress.recalculateRanks(runningSeason._id);
      }

      // Track daysActive for each user.
      for (const user of users) {
        const currentSeason = await LeagueSeason.findOne({
          league: user.league,
          status: 'running',
        });
        if (!currentSeason) continue;
        // Skip users whose league has no running season.
        const userProgress = await LeagueUserProgress.findOne({
          user: user._id,
          leagueSeason: currentSeason._id,
        });
        // Check if the user finished an entry today (with user filter — fixed from previous version).
        const entriesThisDay = await Entry.findOne({
          user: user._id,
          endDate: { $gt: midnight, $lt: todayMidnight },
        });

        // Only count the day as active if they had a qualifying entry (>= 30 min).
        if (entriesThisDay && entriesThisDay.duration >= 30) {
          userProgress.daysActive += 1;
          await userProgress.save({ validateBeforeSave: false });
        }
      }

      // Season lifecycle: create and end seasons based on date ranges.
      for (const seasonName of Object.keys(SEASONS)) {
        const season = SEASONS[seasonName];

        // 1) Create a new season if in its start-end range and none running
        if (today >= season.startDate && today < season.endDate) {
          const existing = await LeagueSeason.findOne({
            startDate: season.startDate,
            endDate: season.endDate,
            status: 'running',
          });

          if (!existing) {
            console.log(`Creating new season: ${seasonName}`);
            await createSeason(seasonName);
          }
        }

        // 2) End expired seasons
        if (today >= season.endDate) {
          const expiredSeasons = await LeagueSeason.find({
            endDate: { $lte: today },
            status: 'running',
          });
          let index = 1;
          for (const currentSeason of expiredSeasons) {
            await endSeason(currentSeason._id, index); // pass season to end
            index++;
          }
        }
      }
    } catch (err) {
      console.error('Error running seasonal cron:', err);
    }
  });
}
module.exports = runCron;
