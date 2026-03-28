const { model, Schema } = require('mongoose');
const League = require('./leagueModel');
const LeagueSeason = require('./leagueSeasonModel');
const LeagueUserProgress = require('./leagueUserProgress');

const warSchema = new Schema({
  challenger: {
    type: Schema.ObjectId,
    ref: 'User',
    required: [true, 'League wars must have a challenger'],
  },
  opponent: {
    type: Schema.ObjectId,
    ref: 'User',
    required: [true, 'League wars must have an opponent'],
  },
  league: {
    type: Schema.ObjectId,
    ref: 'League',
  },
  leagueSeason: {
    type: Schema.ObjectId,
    ref: 'LeagueSeason',
  },
  status: {
    type: String,
    enum: ['active', 'pending', 'finished', 'canceled'],
    default: 'pending',
  },
  request: {
    type: String,
    enum: ['accepted', 'rejected', 'pending'],
    default: 'pending',
  },
  requestExpiresAt: {
    type: Date,
    default: () => Date.now() + 1000 * 60 * 60 * 24 * 3,
  },
  startDate: {
    type: Date,
    default: () => Date.now(),
  },
  endDate: {
    type: Date,
  },
  winner: {
    type: Schema.ObjectId,
    ref: 'User',
    default: null,
  },
  startSnapshot: {
    challenger: {
      XP: Number,
      syntaxForces: Number,
      rank: Number,
      level: Number,
      streak: Number,
    },
    opponent: {
      XP: Number,
      syntaxForces: Number,
      rank: Number,
      level: Number,
      streak: Number,
    },
  },
  challengerProgress: {
    XP: { type: Number, default: 0 },
    syntaxForces: { type: Number, default: 0 },
    rankGained: { type: Number, default: 0 },
    levelGained: { type: Number, default: 0 },
    streak: { type: Number, default: 0 },
  },
  opponentProgress: {
    XP: { type: Number, default: 0 },
    syntaxForces: { type: Number, default: 0 },
    rankGained: { type: Number, default: 0 },
    levelGained: { type: Number, default: 0 },
    streak: { type: Number, default: 0 },
  },
  challengerReward: {
    syntaxForces: Number,
    coins: Number,
  },
  opponentReward: {
    syntaxForces: Number,
    coins: Number,
  },
  finalScore: {
    challenger: Number,
    opponent: Number,
  },
});

warSchema.index({ challenger: 1, leagueSeason: 1 }, { unique: true });

warSchema.pre('save', async function () {
  if (!this.isNew) return;
  const User = model('User');

  const challenger = await User.findById(this.challenger);
  if (!challenger) return;
  const opponent = await User.findById(this.opponent);
  if (!opponent) return;
  this.league = challenger.league;
  const leagueSeason = await LeagueSeason.findOne({
    league: this.league,
    status: 'running',
  });
  if (!leagueSeason) return;
  this.leagueSeason = leagueSeason._id;
  this.endDate = leagueSeason.endDate - 24 * 60 * 60 * 1000;
  const daysLeft = Math.floor(
    (this.endDate - Date.now()) / (24 * 60 * 60 * 1000),
  );
  if (daysLeft <= 10) {
    this.status = 'canceled';
    this.request = 'rejected';
  }
  if (this.status === 'canceled' || this.request === 'rejected') return;
  const challengerLeagueProgress = await LeagueUserProgress.findOne({
    user: this.challenger,
    leagueSeason: leagueSeason._id,
  });
  if (!challengerLeagueProgress) return;
  challenger.warsPlayed += 1;
  this.startSnapshot = this.startSnapshot || {};
  this.startSnapshot.challenger = this.startSnapshot.challenger || {};
  this.startSnapshot.opponent = this.startSnapshot.opponent || {};
  this.startSnapshot.challenger.XP = challengerLeagueProgress.XP;
  this.startSnapshot.challenger.syntaxForces =
    challengerLeagueProgress.syntaxForces;
  this.startSnapshot.challenger.rank = challengerLeagueProgress.rank;
  this.startSnapshot.challenger.streak = challenger.streak;
  this.startSnapshot.challenger.level = challenger.level;
  await challenger.save();
  const opponentLeagueProgress = await LeagueUserProgress.findOne({
    user: this.opponent,
    leagueSeason: leagueSeason._id,
  });
  if (!opponentLeagueProgress) return;
  opponent.warsPlayed += 1;
  this.startSnapshot.opponent.XP = opponentLeagueProgress.XP;
  this.startSnapshot.opponent.syntaxForces =
    opponentLeagueProgress.syntaxForces;
  this.startSnapshot.opponent.rank = opponentLeagueProgress.rank;
  this.startSnapshot.opponent.streak = opponent.streak;
  this.startSnapshot.opponent.level = opponent.level;
  await opponent.save();
});

warSchema.pre('save', async function () {
  if (this.request !== 'accepted' && this.requestExpiresAt <= Date.now()) {
    this.status = 'canceled';
    this.request = 'rejected';
  }
});

warSchema.pre('save', async function () {
  if (!this.isModified('request')) return;

  if (this.request === 'accepted') this.status = 'active';
});

warSchema.pre('save', async function () {
  const User = model('User');
  if (this.status === 'canceled' || this.request === 'rejected') return;
  if (
    !this.isModified('challengerProgress') ||
    !this.isModified('opponentProgress')
  )
    return;
  const challengerLeagueProgress = await LeagueUserProgress.findOne({
    user: this.challenger,
    leagueSeason: this.leagueSeason,
  });
  if (!challengerLeagueProgress) return;
  const opponentLeagueProgress = await LeagueUserProgress.findOne({
    user: this.opponent,
    leagueSeason: this.leagueSeason,
  });
  if (!opponentLeagueProgress) return;
  const opponent = await User.findById(this.opponent);
  if (!opponent) return;
  const challenger = await User.findById(this.challenger);
  if (!challenger) return;
  this.challengerReward = this.challengerReward || {};
  this.opponentReward = this.opponentReward || {};
  this.challengerReward.syntaxForces = opponentLeagueProgress.syntaxForces;
  this.opponentReward.syntaxForces = challengerLeagueProgress.syntaxForces / 2;
  this.challengerReward.coins = Math.floor(opponent.coins / 2);
  this.opponentReward.coins = Math.floor(challenger.coins / 4);
});

const War = model('War', warSchema);

module.exports = War;
