const { model, Schema, default: mongoose } = require('mongoose');

const leagueRulesSchema = new Schema({
  leagueSeason: {
    type: mongoose.Schema.ObjectId,
    ref: 'LeagueSeason',
  },
  promotion: {
    promotionRank: {
      type: Number,
    },
    promotionSF: {
      type: Number,
    },
    demotionRank: {
      type: Number,
    },
    demotionSF: {
      type: Number,
    },
  },
  maxDaysSpent: {
    type: Number,
  },
});

leagueRulesSchema.index({ leagueSeason: 1 }, { unique: true });

const LeagueRules = model('LeagueRules', leagueRulesSchema);

module.exports = LeagueRules;
