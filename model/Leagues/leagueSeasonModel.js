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
    default: () => Date.now() + 30 * 24 * 60 * 60 * 1000,
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
    enum: ['scheduled', 'running', 'finished', 'archived'],
    required: true,
  },
});

// Ensures only one running season can exist per league at a time.
// partialFilterExpression means the unique constraint only applies to status: 'running' docs.
LeagueSeasonSchema.index(
  { league: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'running' },
  },
);

// Guard against modifying archived seasons.
LeagueSeasonSchema.pre('save', function () {
  if (!this.isNew && this.status === 'archived') {
    throw new Error('Archived season is immutable');
  }
});

const LeagueSeason = model('LeagueSeason', LeagueSeasonSchema);

module.exports = LeagueSeason;
