const {
  OBJECTIVE_BASE,
  calcObjective,
} = require('../../utils/calculateObjective');
const Project = require('../../model/Entries/projectModel');
const League = require('../../model/Leagues/leagueModel');
const { Schema, model } = require('mongoose');

const questSchema = new Schema({
  name: {
    type: String,
  },
  description: {
    type: String,
  },
  frequency: {
    type: String,
    required: [true, 'Quests should have a frequency!'],
    enum: ['daily', 'seasonal'],
  },
  scope: {
    type: String,
    required: [true, 'Quests should have a scope!'],
    enum: ['global', 'project'],
    validate: {
      validator: function (v) {
        if (v === 'project' && !this.projectId) return false;
        return true;
      },
      message: `projectId is required for a project scope`,
    },
  },
  objectiveType: {
    type: String,
    required: [true, 'Quests should have a objective type!'],
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
  objective: {
    type: Number,
  },
  rewardType: {
    type: String,
    required: [true, 'Quests should have a reward type!'],
    enum: ['XP', 'syntaxForces', 'coins'],
  },
  reward: {
    type: Number,
  },
  author: {
    type: Schema.ObjectId,
    ref: 'User',
    sparse: true,
  },
  projectId: {
    type: Schema.ObjectId,
    ref: 'Project',
    validate: {
      validator: function (v) {
        if (this.scope !== 'project') return false;
        return true;
      },
      message: `You did not specify the scope as project to enter a projectId`,
    },
  },
  league: { type: Schema.ObjectId, ref: 'League' },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard', 'legendary'],
  },
});

const REWARD_FACTORS = {
  XP: {
    coins: 0.01,
  },
  syntaxForces: {
    coins: 1,
  },
  rank: {
    coins: 10,
  },
  entries: {
    coins: 5,
  },
  level: {
    coins: 50,
  },
  project: {
    coins: 250,
    XP: 10000,
    syntaxForces: 75,
  },
  battles: {
    coins: 100,
    XP: 5000,
    syntaxForces: 50,
  },
  war: {
    coins: 500,
    XP: 50000,
  },
};

const LEAGUE_MULTIPLIER = {
  Bronze: 0.5,
  Silver: 0.6,
  GoldI: 0.7,
  GoldII: 0.8,
  CupriteI: 0.9,
  CupriteII: 1.0,
  CupriteIII: 1.1,
  ObsidianI: 1.2,
  ObsidianII: 1.35,
  ObsidianIII: 1.5,
  DiamondI: 1.6,
  DiamondII: 1.7,
  DiamondIII: 1.8,
  UraniumI: 1.85,
  UraniumII: 1.9,
  UraniumIII: 1.95,
  AetheriumI: 2.0,
  AetheriumII: 2.2,
  AetheriumIII: 2.0,
  AetheriumIV: 3.0,
};

function getDifficulty(objectiveType, objective, leagueOrder) {
  const { base } = OBJECTIVE_BASE[objectiveType].seasonal;
  const midPoint = base * Math.pow(1.2, leagueOrder - 1);

  if (objective <= midPoint * 0.5) return 'easy';
  if (objective <= midPoint) return 'medium';
  if (objective <= midPoint * 2) return 'hard';
  return 'legendary';
}

questSchema.methods.calculateReward = async function () {
  const frequencyMultiplyer = this.frequency === 'daily' ? 1 : 4;
  const difficultyMultiplyer =
    this.difficulty === 'easy' ? 1 : this.difficulty === 'medium' ? 1.75 : 3;
  const league = await League.findById(this.league);
  if (!league) return;
  const leagueMultiplyer = LEAGUE_MULTIPLIER[league.name];
  let projectDifficulty = 1;
  if (this.project) {
    const project = await Project.findById(this.project);
    if (!project) return;
    projectDifficulty =
      project.difficulty <= 25
        ? 1
        : project.difficulty <= 50
          ? 1.5
          : project.difficulty <= 75
            ? 2
            : 3;
  }
  const base =
    REWARD_FACTORS[this.objectiveType][this.rewardType] * this.objective;
  if (!base) return 0;
  return (
    base *
    frequencyMultiplyer *
    difficultyMultiplyer *
    leagueMultiplyer *
    projectDifficulty
  );
};

questSchema.pre('save', async function () {
  if (!this.isNew) return;
  if (!this.author) this.author = 'Byteforce';
  if (this.rewardType === this.objectiveType) this.rewardType = 'coins';
  if (this.rewardType === 'XP' || this.rewardType === 'syntaxForces') {
    if (
      this.objectiveType === 'XP' ||
      this.objectiveType === 'syntaxForces' ||
      this.objectiveType === 'rank'
    )
      this.rewardType = 'coins';
  }

  if (this.scope === 'project') {
    if (this.rewardType !== 'coins') this.rewardType = 'coins';
    this.reward = await this.calculateReward(null);
    return;
  }
  const league = await League.findById(this.league);
  if (!league) return;
  const action =
    this.objectiveType === 'war' || this.objectiveType === 'battles'
      ? 'Win'
      : this.objectiveType === 'level' || this.objectiveType === 'rank'
        ? 'Climb'
        : this.objectiveType === 'project' || this.objectiveType === 'entries'
          ? 'Complete'
          : 'Get';
  this.difficulty = getDifficulty(
    this.objectiveType,
    this.objective,
    league.order,
  );
  this.objective = calcObjective(
    this.objectiveType,
    league.order,
    this.frequency,
  );
  this.name = `${action} ${this.objective} ${this.objectiveType}`;
  this.description = `${action} ${this.objective} ${this.objectiveType} this ${this.frequency === 'daily' ? 'day' : 'season'}`;
  this.reward = await this.calculateReward(league);
});

const Quest = model('Quest', questSchema);

module.exports = Quest;
