const { createSeason, endSeason } = require('../handleSeason');
const cron = require('node-cron');
const League = require('../model/Leagues/leagueModel');
const LeagueSeason = require('../model/Leagues/leagueSeasonModel');
const LeagueUserProgress = require('../model/Leagues/leagueUserProgress');
const User = require('../model/User/userModel');
const Entry = require('../model/Entries/entryModel');

// This cron job runs every day at midnigt
function runCron() {
  cron.schedule('0 0 * * *', async () => {
    try {
      const midnight = new Date();
      midnight.setHours(0, 0, 0, 0);
      const todayMidnight = new Date();
      midnight.setHours(23, 59, 59, 0);
      const today = new Date();
      const users = await User.find();
      const leagues = await League.find();
      for (const league of leagues) {
        await LeagueUserProgress.recalculateRanks(league._id);
      }

      for (const user of users) {
        const currentSeason = await LeagueSeason.findOne({
          league: user.league,
          status: 'running',
        });
        const userProgress = await LeagueUserProgress.findOne({
          user: user._id,
          leagueSeason: currentSeason._id,
        });
        const entriesThisDay = await Entry.findOne({
          endDate: { $gt: midnight, $lt: todayMidnight },
        });

        if (entriesThisDay && entriesThisDay.duration >= 30) {
          userProgress.daysActive += 1;
          await userProgress.save({ validateBeforeSave: false });
        }
      }

      for (const seasonName of SEASONS) {
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
