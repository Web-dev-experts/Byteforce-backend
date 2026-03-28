const User = require('../../model/User/userModel');
const { model, Schema } = require('mongoose');
const LeagueSeason = require('./leagueSeasonModel');
const LeagueUserProgress = require('./leagueUserProgress');

const battleSchema = new Schema({
  playerOne: {
    type: Schema.ObjectId,
    ref: 'User',
    required: [true, 'League battles must have users'],
  },
  playerTwo: {
    type: Schema.ObjectId,
    ref: 'User',
    required: [true, 'League battles must have users'],
  },
  league: {
    type: Schema.ObjectId,
    ref: 'League',
    required: [true, 'League battles must have a league'],
  },
  leagueSeason: {
    type: Schema.ObjectId,
    ref: 'LeagueSeason',
    required: [true, 'League battles must have a league season'],
  },
  startDate: {
    type: Date,
    default: () => Date.now(),
  },
  endDate: {
    type: Date,
  },
  status: {
    type: String,
    default: 'scheduled',
    enum: ['scheduled', 'pending', 'active', 'finished'],
  },
  winner: {
    type: Schema.ObjectId,
    ref: 'User',
    default: null,
  },
  startSnapshot: {
    playerOne: {
      XP: Number,
      syntaxForces: Number,
      rank: Number,
      level: Number,
      streak: Number,
    },
    playerTwo: {
      XP: Number,
      syntaxForces: Number,
      rank: Number,
      level: Number,
      streak: Number,
    },
  },
  playerOneProgress: {
    XP: { type: Number, default: 0 },
    syntaxForces: { type: Number, default: 0 },
    rankGained: { type: Number, default: 0 },
    levelGained: { type: Number, default: 0 },
    streak: { type: Number, default: 0 },
  },
  playerTwoProgress: {
    XP: { type: Number, default: 0 },
    syntaxForces: { type: Number, default: 0 },
    rankGained: { type: Number, default: 0 },
    levelGained: { type: Number, default: 0 },
    streak: { type: Number, default: 0 },
  },
  playerOneReward: {
    syntaxForces: Number,
    coins: Number,
  },
  playerTwoReward: {
    syntaxForces: Number,
    coins: Number,
  },
  finalScore: {
    playerOne: Number,
    playerTwo: Number,
  },
});

battleSchema.pre('save', async function () {
  if (!this.isNew) return;
  this.endDate = new Date(this.startDate.getTime() + 1000 * 60 * 60 * 24 * 7);
  const season = await LeagueSeason.findOne({
    league: this.league,
    status: 'running',
  });
  if (!season) return;
  this.leagueSeason = season._id;
  const userOneProgress = await LeagueUserProgress.findOne({
    user: this.playerOne,
    leagueSeason: season._id,
  });
  if (!userOneProgress) return;
  const userOne = await User.findById(this.playerOne);
  if (!userOne) return;
  userOne.battlesPlayed += 1;
  this.startSnapshot = this.startSnapshot || {};
  this.startSnapshot.playerOne = this.startSnapshot.playerOne || {};
  this.startSnapshot.playerTwo = this.startSnapshot.playerTwo || {};
  this.startSnapshot.playerOne.XP = userOneProgress.XP;
  this.startSnapshot.playerOne.syntaxForces = userOneProgress.syntaxForces;
  this.startSnapshot.playerOne.rank = userOneProgress.rank;
  this.startSnapshot.playerOne.streak = userOne.streak;
  this.startSnapshot.playerOne.level = userOne.level;
  await userOne.save();
  const userTwoProgress = await LeagueUserProgress.findOne({
    user: this.playerTwo,
    leagueSeason: season._id,
  });
  if (!userTwoProgress) return;
  const userTwo = await User.findById(this.playerTwo);
  if (!userTwo) return;
  userTwo.battlesPlayed += 1;
  this.startSnapshot.playerTwo.XP = userTwoProgress.XP;
  this.startSnapshot.playerTwo.syntaxForces = userTwoProgress.syntaxForces;
  this.startSnapshot.playerTwo.rank = userTwoProgress.rank;
  this.startSnapshot.playerTwo.streak = userTwo.streak;
  this.startSnapshot.playerTwo.level = userTwo.level;
  await userTwo.save();
  this.markModified('startSnapshot');
});

battleSchema.pre('save', async function () {
  if (
    !this.isModified('playerOneProgress') ||
    !this.isModified('playerTwoProgress')
  )
    return;
  const playerOneProgress = await LeagueUserProgress.findOne({
    user: this.playerOne,
    leagueSeason: this.leagueSeason,
  });
  if (!playerOneProgress) return;
  const playerTwoProgress = await LeagueUserProgress.findOne({
    user: this.playerTwo,
    leagueSeason: this.leagueSeason,
  });
  if (!playerTwoProgress) return;
  this.playerOneReward.syntaxForces = Math.floor(
    (playerTwoProgress.syntaxForces * 5) / 100,
  );
  this.playerTwoReward.syntaxForces = Math.floor(
    (playerOneProgress.syntaxForces * 5) / 100,
  );
});

const Battle = model('Battle', battleSchema);

module.exports = Battle;
