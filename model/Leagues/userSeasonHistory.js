const { Schema, model } = require('mongoose');

const userHistorySchema = new Schema(
  {
    user: {
      type: Schema.ObjectId,
      ref: 'User',
      required: true,
    },
    leagueSeason: {
      type: Schema.ObjectId,
      ref: 'LeagueSeason',
      required: true,
    },
    league: {
      type: Schema.ObjectId,
      ref: 'League',
      required: true,
    },
    // Denormalized season/league names so history is readable even if
    // the original LeagueSeason document is deleted.
    seasonName: {
      type: String,
      required: true,
    },
    seasonNumber: {
      type: Number,
    },
    leagueName: {
      type: String,
      required: true,
    },
    finalXP: {
      type: Number,
      required: true,
    },
    finalSF: {
      type: Number,
      required: true,
    },
    finalRank: {
      type: Number,
      required: true,
    },
    promoted: {
      type: Boolean,
      default: false,
    },
    demoted: {
      type: Boolean,
      default: false,
    },
    highestLevel: { type: Number },
    highestStreak: { type: Number },
    highestLeague: { type: Number },
  },
  { timestamps: true },
);

// Prevents creating duplicate history records for the same user and season.
userHistorySchema.index({ user: 1, leagueSeason: 1 }, { unique: true });

const UserSeasonHistory = model('UserSeasonHistory', userHistorySchema);

module.exports = UserSeasonHistory;
