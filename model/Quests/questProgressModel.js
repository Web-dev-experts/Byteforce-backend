const { Schema, model } = require('mongoose');
const Quest = require('./questModel');
const League = require('../../model/Leagues/leagueModel');
const LeagueSeason = require('../../model/Leagues/leagueSeasonModel');

const questProgressModel = new Schema({
  quest: {
    type: Schema.ObjectId,
    ref: 'Quest',
  },
  user: {
    type: Schema.ObjectId,
    ref: 'User',
  },
  progressType: {
    type: String,
    required: [true, 'Quest progresses should have a progress type!'],
    enum: [
      'XP',
      'syntaxForces',
      'rank',
      'entries',
      'level',
      'project',
      'battles',
      'war',
    ],
  },
  progress: {
    type: Number,
    default: 0,
  },
  completed: { type: Boolean, default: false },
  assignedAt: { type: Date, default: () => Date.now() },
  expiresAt: { type: Date },
});

questProgressModel.pre('save', async function () {
  if (!this.isNew) return;
  const quest = await Quest.findById(this.quest);
  if (!quest) return;
  const league = await League.findById(quest.league);
  if (!league) return;
  const runningSeason = await LeagueSeason.findOne({
    league: league._id,
    status: 'running',
  });
  if (!runningSeason) return;
  if (this.progressType !== quest.objectiveType)
    this.progressType = quest.objectiveType;
  this.expiresAt =
    quest.frequency === 'daily'
      ? this.assignedAt + 1000 * 60 * 60 * 24
      : runningSeason.endDate;
});

questProgressModel.pre('save', async function () {
  const User = model('User');
  if (!this.isModified('progress')) return;
  if (Date.now() > this.expiresAt) this.completed = false;
  const quest = await Quest.findById(this.quest);
  if (!quest) return;
  if (this.progress >= quest.objective) {
    this.completed = true;
    const progressUser = await User.findById(this.user);
    const author = await User.findById(quest.author);
    if (quest.scope === 'project' && quest.author) {
      if (!author) return;
      author.coins -= quest.reward;
      progressUser.coins += quest.reward;
      await progressUser.save();
      await author.save();
      return;
    }
    progressUser[quest.rewardType] += quest.reward;
    await progressUser.save();
  }
});

const QuestProgress = model('QuestProgress', questProgressModel);

module.exports = QuestProgress;
