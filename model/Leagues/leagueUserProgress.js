const { model, Schema, default: mongoose } = require('mongoose');
const LeagueSeason = require('./leagueSeasonModel');
const League = require('./leagueModel');

const leagueUserProgress = new Schema({
  leagueSeason: {
    type: mongoose.Schema.ObjectId,
    ref: 'LeagueSeason',
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
  },
  XP: {
    type: Number,
    default: 0,
  },
  syntaxForces: {
    type: Number,
    default: 0,
  },
  rank: {
    type: Number,
  },
  daysActive: {
    type: Number,
  },
});

leagueUserProgress.methods.recalculateRanks = async function (leagueSeasonId) {
  const progresses = await LeagueUserProgress.find({
    leagueSeason: leagueSeasonId,
  }).sort({
    syntaxForces: -1,
    updatedAt: 1, // deterministic tie-breaker
  });

  console.log(progresses);

  const bulkOps = progresses.map((progress, index) => ({
    updateOne: {
      filter: { _id: progress._id },
      update: { $set: { rank: index + 1 } },
    },
  }));

  if (bulkOps.length > 0) {
    await LeagueUserProgress.bulkWrite(bulkOps);
  }
};

leagueUserProgress.index({ user: 1, leagueSeason: 1 }, { unique: true });

const LeagueUserProgress = model('LeagueUserProgress', leagueUserProgress);

module.exports = LeagueUserProgress;
