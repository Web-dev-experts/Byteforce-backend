const { model, Schema, default: mongoose } = require('mongoose');

const LeagueSeasonSchema = new Schema({
  name: {
    type: String,
    required: [true, 'The league must have a name!'],
  },
  league: {
    type: mongoose.Schema.ObjectId,
    ref: 'League',
  },
  startDate: {
    type: Date,
    default: Date.now,
  },
  endDate: {
    type: Date,
    default: Date.now + 30 * 24 * 60 * 60 * 1000,
  },
  seasonNumber: {
    type: Number,
    required: true,
  },
  bonus: {
    type: Number,
  },
  status: {
    type: String,
    default: 'running',
    status: {
      type: String,
      enum: ['scheduled', 'running', 'finished', 'archived'],
      required: true,
    },
  },
});

LeagueSeasonSchema.index(
  { league: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'running' },
  },
);

LeagueSeasonSchema.pre('save', function () {
  if (!this.isNew && this.leagueSeasonStatus === 'archived') {
    return next(new Error('Archived season is immutable'));
  }
});

const LeagueSeason = model('LeagueSeason', LeagueSeasonSchema);

module.exports = LeagueSeason;
