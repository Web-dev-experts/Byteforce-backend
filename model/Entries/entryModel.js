const LeagueSeason = require('../../model/Leagues/leagueSeasonModel');
const League = require('../../model/Leagues/leagueModel');
const LeagueUserProgress = require('../../model/Leagues/leagueUserProgress');
const User = require('../../model/User/userModel');
const crypto = require('crypto');
const { default: mongoose } = require('mongoose');
const { model, Schema } = require('mongoose');
const { validate } = require('node-cron');
const Project = require('./projectModel');
const Subscription = require('../../model/pricing/pricingModel');

// CONFIG //

// Max XP for a single entry
const MAX_XP = 5000;
const MAX_SF = 50;

// Max entries per day
const MAX_ENTRIES_PER_DAY = 5;

// Type multipliers
const TYPE_MULTIPLIERS = {
  project: 1.2,
  miniProject: 0.6,
  exercise: 0.4,
};

// Activity multipliers
const ACTIVITY_MULTIPLIERS = {
  // Core coding
  coding: 1.2,
  debugging: 1.1,
  refactoring: 0.8,
  testing: 0.6,
  optimizing: 1.0,

  // Learning
  learning: 0.7,
  research: 0.8,
  readingDocs: 0.6,
  watchingTutorial: 0.5,
  experimenting: 0.9,

  // Planning & architecture
  planning: 0.7,
  systemDesign: 1.1,
  databaseDesign: 1.0,
  apiDesign: 1.0,

  // Problem solving
  problemSolving: 1.3,
  algorithmPractice: 1.4,
  bugHunting: 1.2,

  // Project & delivery
  featureImplementation: 1.2,
  integration: 1.0,
  deployment: 0.8,
  maintenance: 0.9,

  // Quality & polish
  codeReview: 0.8,
  cleanup: 0.6,
  performanceTuning: 1.1,
  securityHardening: 1.2,

  // Low impact
  setup: 0.4,
  configuration: 0.4,
  tooling: 0.5,
  documentation: 0.5,
};

// SF points per XP (can be tuned)
const SF_PER_XP = 0.01; // 1 SF per 100 XP

// Minimum XP per entry
const MIN_XP = 50;

// FUNCTIONS
// Calculates XP & SF for a single entry based on type, activity, duration, and daily factor
const BASE_CAP = 3500;
const GROWTH_RATE = 0.018;

function calculateXPSF(type, activity, duration, numEntry) {
  const typeMultiplier = TYPE_MULTIPLIERS[type] || 1;
  const activityMultiplier = ACTIVITY_MULTIPLIERS[activity] || 1;

  // Exponential growth curve
  const baseXP = BASE_CAP * (1 - Math.exp(-GROWTH_RATE * duration));

  // Daily diminishing returns
  const dailyFactor = Math.max(0.6, 1 - 0.12 * (numEntry - 1));

  const xp = baseXP * typeMultiplier * activityMultiplier * dailyFactor;

  const finalXP = Math.max(MIN_XP, Math.round(xp));

  const sf = Math.round(finalXP * SF_PER_XP);

  return { xp: finalXP, sf };
}

// Entry Schema
const entrySchema = new Schema(
  {
    title: {
      type: String,
      required: [true, 'an entry must have a title!'],
    },
    description: String,
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'an entry must belong to a user!'],
    },
    projectId: {
      type: mongoose.Schema.ObjectId,
      ref: 'Project',
    },
    type: {
      type: String,
      required: [true, 'You must precise the entry type!'],
      enum: ['project', 'miniProject', 'exercise'],
      validate: {
        validator: function (v) {
          console.log(v, v === 'project' && this.projectId);
          if (v === 'project' && this.projectId) return false; // project must be linked
          return true;
        },
        message:
          'If you select the type project, you must link it to an existant project',
      },
    },
    activity: {
      type: String,
      required: [true, 'You must precise the entry activity!'],
      enum: [
        'coding',
        'debugging',
        'testing',
        'algorithmPractice',
        'dataStructuresPractice',
        'learningLibraries',
        'documentation',
        'codeReview',
        'refactoring',
        'debuggingToolsPractice',
        'readingDocs',
        'watchingTutorials',
        'structuringLearning',
        'noteTaking',
        'algorithmStudy',
        'interviewPrep',
        'buildingProjects',
        'collaboration',
        'deployingHosting',
        'versionControl',
        'challenges',
        'dailyStreaks',
        'achievements',
        'learningNewLanguages',
        'exploringNewTech',
      ],
    },
    XPGranted: {
      type: Number,
      default: 0,
    },
    SFGranted: {
      type: Number,
      default: 0,
    },
    startDate: { type: Date, default: Date.now },
    endDate: Date,
    duration: {
      type: Number,
      max: 120,
    },
    status: {
      type: String,
      default: 'started',
      enum: ['started', 'finished'],
    },
    field: {
      type: [String],
      enum: [
        'frontend',
        'backend',
        'fullstack',
        'mobile',
        'game',

        'algorithms',
        'dataStructures',
        'databases',

        'devops',
        'cloud',
        'security',

        'dataScience',
        'machineLearning',
        'artificialIntelligence',

        'testing',
        'refactoring',
        'automation',
        'computerScience',
        'other',
      ],
      default: ['computerScience'],
    },
    accepted: { type: Boolean, select: false, default: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Count how many accepted entries the user has today
entrySchema.methods.countTodayEntries = async function () {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date();
  end.setHours(23, 59, 59, 999);

  return await this.constructor.countDocuments({
    user: this.user,
    createdAt: { $gte: start, $lte: end },
    accepted: true, // only count accepted entries
  });
};

// Finish an entry, calculate XP/SF, and update user
entrySchema.methods.finishEntry = async function () {
  const entriesThisDay = await this.countTodayEntries();

  // GUARD: Prevent finishing an entry twice
  if (this.status === 'finished')
    throw new Error('This entry already finished!');

  // Too many entries today
  if (entriesThisDay > MAX_ENTRIES_PER_DAY) {
    this.accepted = false;
    this.status = 'finished';
    this.XPGranted = 0;
    this.SFGranted = 0;
    this.endDate = Date.now();
    await this.save();
    return;
  }

  this.endDate = Date.now();
  const durationMs = this.endDate - this.startDate;
  const durationMinutes = Math.floor(durationMs / 60000);
  this.duration = durationMinutes;

  // Too short entry (<1 min)
  if (Number(this.duration) < 1) {
    this.accepted = false;
    this.status = 'finished';
    this.XPGranted = 0;
    this.SFGranted = 0;
    await this.save();
    return;
  }

  // Too long entry (>4h)
  if (Number(this.duration) > 240) {
    const user = await User.findById(this.user);
    this.status = 'finished';
    this.accepted = false;
    this.XPGranted = -500;
    this.SFGranted = -5;

    if (!user) return;
    const userLeague = await League.findById(user.league);
    if (!userLeague) return;

    const runningSeason = await LeagueSeason.findOne({
      league: userLeague._id,
      status: 'running',
    });
    const leagueUserProgress = await LeagueUserProgress.findOne({
      user: this.user,
      leagueSeason: runningSeason._id,
    });
    user.XP += this.XPGranted;
    user.syntaxForces += this.SFGranted;
    leagueUserProgress.XP += this.XPGranted;
    leagueUserProgress.syntaxForces += this.SFGranted;

    await user.save();
    await leagueUserProgress.save();
    await LeagueUserProgress.recalculateRanks(userLeague);
    await this.save();
    return;
  }

  // Cap duration at 120 minutes
  if (Number(this.duration) > 120) this.duration = 120;
  this.status = 'finished';

  // Calculate XP & SF for this entry
  const { xp, sf } = calculateXPSF(
    this.type,
    this.activity,
    this.duration,
    entriesThisDay,
  );
  const user = await User.findById(this.user);
  if (!user) return;

  // Clamp XP & SF to min/max
  const clampedXP = Math.min(MAX_XP, Math.max(MIN_XP, xp));
  const clampedSF = Math.min(MAX_SF, Math.max(0, sf));

  const subscription = await Subscription.findById(user.subscription);
  const bonus = subscription.XPBonus;

  this.XPGranted = Math.floor(clampedXP) * bonus;
  this.SFGranted = Math.floor(clampedSF);

  // Update user's XP, SF, and streak
  if (entriesThisDay < 1 && this.duration > 29) user.streak += 1;
  const userLeague = await League.findById(user.league);
  if (!userLeague) return;

  const runningSeason = await LeagueSeason.findOne({
    league: userLeague._id,
    status: 'running',
  });
  let leagueUserProgress = await LeagueUserProgress.findOne({
    user: this.user,
    leagueSeason: runningSeason._id,
  });
  if (!leagueUserProgress) {
    const usersCount = await this.constructor.countDocuments({
      league: userLeague._id,
    });

    leagueUserProgress = await LeagueUserProgress.create({
      leagueSeason: runningSeason._id,
      user: this.user,
      XP: 0,
      rank: usersCount + 1,
      syntaxForces: 0,
      daysActive: 0,
    });
  }
  user.XP += this.XPGranted;
  user.syntaxForces += this.SFGranted;
  leagueUserProgress.XP += this.XPGranted;
  leagueUserProgress.syntaxForces += this.SFGranted;

  const project = await Project.findById(this.projectId);
  if (project && this.projectId) {
    console.log(this._id);

    project.entries.push(this._id);
    project.XPGained += this.XPGranted;
    project.SFGained += this.SFGranted;

    await project.save();
  }

  await user.save();
  await leagueUserProgress.save();
  await leagueUserProgress.recalculateRanks(runningSeason._id);

  await this.save();
};

const Entry = model('Entry', entrySchema);

module.exports = Entry;
