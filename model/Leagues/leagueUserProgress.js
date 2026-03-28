const { model, Schema, default: mongoose } = require('mongoose');

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
    // Rank is not set on creation — assigned by recalculateRanks.
  },
  daysActive: {
    type: Number,
    // Incremented by seasonCron when a user finishes a qualifying entry.
  },
});

// ── recalculateRanks (static) ─────────────────────────────
// Fetches all progress documents for a season, sorts by SF descending
// (ties broken by updatedAt ascending — earlier updaters rank higher),
// then bulk-updates all rank fields atomically.
// Fixed from instance method to static so it can be called as:
// LeagueUserProgress.recalculateRanks(seasonId)
leagueUserProgress.statics.recalculateRanks = async function (leagueSeasonId) {
  const progresses = await LeagueUserProgress.find({
    leagueSeason: leagueSeasonId,
  }).sort({
    syntaxForces: -1,
    updatedAt: 1, // deterministic tie-breaker
  });

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

// Prevents duplicate progress records per user per season.
leagueUserProgress.index({ user: 1, leagueSeason: 1 }, { unique: true });

const LeagueUserProgress = model('LeagueUserProgress', leagueUserProgress);

module.exports = LeagueUserProgress;
