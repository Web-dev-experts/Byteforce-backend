const { model, Schema, default: mongoose } = require('mongoose');

const leagueRulesSchema = new Schema({
  // Each rules document is scoped to a single LeagueSeason.
  leagueSeason: {
    type: mongoose.Schema.ObjectId,
    ref: 'LeagueSeason',
  },
  promotion: {
    promotionRank: {
      type: Number,
      // The top-N% of players (by rank) are promoted.
    },
    promotionSF: {
      type: Number,
      // Minimum SyntaxForces to be directly promoted regardless of rank.
    },
    demotionRank: {
      type: Number,
      // NOTE: demotionRank is defined in the schema but never used in endSeason logic.
      // Demotion is decided only by demotionSF and daysActive.
    },
    demotionSF: {
      type: Number,
      // Users below this SF threshold are demoted.
    },
  },
  maxDaysSpent: {
    type: Number,
    // Users who have been inactive too long (daysActive >= maxDaysSpent) are demoted.
    // Currently hardcoded to 200 in createSeason() rather than set per season.
  },
});

// One rules document per season — enforced by unique index.
leagueRulesSchema.index({ leagueSeason: 1 }, { unique: true });

const LeagueRules = model('LeagueRules', leagueRulesSchema);

module.exports = LeagueRules;
