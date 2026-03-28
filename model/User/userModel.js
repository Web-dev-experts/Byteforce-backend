const { model, Schema, Types } = require('mongoose');
const mongoose = require('mongoose');
const isEmail = require('validator/lib/isEmail');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const LeagueSeason = require('../../model/Leagues/leagueSeasonModel');
const League = require('../../model/Leagues/leagueModel');
const LeagueUserProgress = require('../../model/Leagues/leagueUserProgress');
const Subscription = require('../../model/pricing/pricingModel');
const Entry = require('../../model/Entries/entryModel');
const Quest = require('../../model/Quests/questModel');
const QuestProgress = require('../../model/Quests/questProgressModel');
const War = require('../../model/Leagues/leagueWars');
const Battle = require('../../model/Leagues/leagueBattles');

const userModel = new Schema(
  {
    googleId: {
      type: String,
      unique: true,
      // sparse: true allows multiple documents to have no googleId (null/undefined)
      // without violating the unique constraint.
      sparse: true,
    },
    githubId: {
      type: String,
      unique: true,
      sparse: true,
    },
    githubAccessToken: {
      type: String,
      select: false,
    },
    authProvider: {
      type: String,
      enum: ['local', 'google', 'github'],
      default: 'local',
    },
    name: {
      type: String,
      required: [true, 'The user must have a name! Please enter your name'],
    },
    email: {
      type: String,
      required: [
        true,
        'The user must have an email! Please provide your email!',
      ],
      unique: true,
      lowercase: true,
      validate: {
        validator: function (v) {
          return isEmail(v);
        },
        message: 'This email is not valid! Please enter a valid email!',
      },
    },
    emailVerificationCode: { type: Number, select: false },
    emailVerificationExpires: { type: Date, select: false },
    emailVerified: { type: Boolean, default: false, select: false },
    password: {
      type: String,
      required: function () {
        return this.authProvider === 'local';
      },
    },
    confirmPassword: {
      type: String,
      required: function () {
        return this.authProvider === 'local';
      },
      validate: {
        validator: function (v) {
          if (this.authProvider !== 'local') return true;
          return this.password === v;
        },
        message: "Passwords don't match!",
      },
      select: false,
    },
    passwordResetCode: { type: String, select: false },
    passwordResetExpires: {
      type: Date,
      select: false,
    },
    passwordChangedAt: { type: Date, select: false },
    profilePicture: {
      type: String,
      default: 'users/default.png',
      validate: {
        validator: (v) => typeof v === 'string',
        message: 'Profile picture must be a string URL or filename',
      },
    },
    photoPublicId: {
      type: String,
    },
    league: {
      type: mongoose.Schema.ObjectId,
      ref: 'League',
      // Default league ID comes from config.env — avoids hardcoding ObjectIds in source code.
      // Mongoose will coerce it to ObjectId automatically.
      default: process.env.DEFAULT_LEAGUE_ID,
      index: true,
    },
    XP: {
      type: Number,
      default: 0,
      min: 0,
    },
    syntaxForces: {
      type: Number,
      default: 0,
      min: 0,
    },
    level: {
      type: Number,
      default: 1,
      min: 1,
      max: 100,
    },
    coins: {
      type: Number,
      default: 200,
      min: 0,
    },
    streak: {
      type: Number,
      default: 0,
      min: 0,
    },
    projects: [{ type: Schema.Types.ObjectId, ref: 'Project' }],
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
    attribute: {
      type: String,
      enum: [
        'Syntax Striker',
        'Deep Diver',
        'Quest Hunter',
        'War Machine',
        'Architect',
        'The Grinder',
        'Phantom Coder',
        'Code Berserker',
        'The Specialist',
        'Silent Builder',
        'Momentum King',
        'The Consistent',
        'Ranked Predator',
        'Sprint Runner',
        'The Craftsman',
        'Void Walker',
        'Chain Breaker',
        'The Relentless',
        'Shadow Dev',
        'Apprentice',
      ],
      default: 'Apprentice',
    },
    streakAttribute: {
      type: String,
      enum: [
        'Sunday Starter',
        'Early Riser',
        'Monday Warrior',
        'Midweek Machine',
        'Hump Day Hero',
        'End Rusher',
        'The Finisher',
        'Iron Weekday',
        'Weekend Warrior',
        'Drifter',
      ],
      default: 'Drifter',
    },
    consistencyScore: {
      type: Number,
      default: 0,
    },
    highestLevel: { type: Number },
    highestStreak: { type: Number },
    highestLeague: { type: String },
    battlesPlayed: { type: Number, default: 0 },
    battlesWon: { type: Number, default: 0 },
    battlesWinPercentage: { type: Number, default: 0 },
    warsPlayed: { type: Number, default: 0 },
    warsWon: { type: Number, default: 0 },
    warsWinPercentage: { type: Number, default: 0 },
    warRequest: {
      from: { type: Schema.Types.ObjectId, ref: 'User' },
      decision: {
        type: String,
        enum: ['accepted', 'rejected', 'pending'],
      },
    },

    role: {
      type: String,
      default: 'user',
      enum: ['user', 'admin'],
    },
    subscription: {
      type: Schema.Types.ObjectId,
      ref: 'Subscription',
      // Default free plan ID from config.env.
      default: process.env.DEFAULT_SUBSCRIPTION_ID,
    },
    streakFreezes: {
      type: Number,
      default: 0,
    },
    subscriptionStatus: {
      type: String,
      enum: ['active', 'canceled', 'past_due'],
    },

    stripeCustomerId: String,
    stripeSubscriptionId: {
      type: String,
    },
    subscriptionStart: Date,
    subscriptionEnd: Date,
    // active: false means the account is deactivated.
    // The pre-find hook filters these out so they are invisible to all queries.
    active: { type: Boolean, default: true, select: false },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// ── XP → Level system ─────────────────────────────────────
// Five tiers with increasing base XP and growth rates.
// Each level within a tier costs: base * growth^(levelInTier).
// Growth rate increases with tier — higher levels are exponentially harder.
const TIERS = [
  { from: 1, to: 25, base: 1_000, growth: 1.08 },
  { from: 26, to: 50, base: 10_000, growth: 1.1 },
  { from: 51, to: 75, base: 80_000, growth: 1.12 },
  { from: 76, to: 89, base: 300_000, growth: 1.14 },
  { from: 90, to: 100, base: 900_000, growth: 1.18 },
];
const ATTRIBUTE_RULES = [
  {
    name: 'Syntax Striker',
    requires: ['velocity', 'aggression'],
    threshold: 60,
  },
  { name: 'Deep Diver', requires: ['endurance', 'consistency'], threshold: 60 },
  {
    name: 'Quest Hunter',
    requires: ['dedication', 'diversity'],
    threshold: 60,
  },
  { name: 'War Machine', requires: ['aggression', 'velocity'], threshold: 65 },
  {
    name: 'The Consistent',
    requires: ['consistency', 'dedication'],
    threshold: 60,
  },
  { name: 'Sprint Runner', requires: ['velocity', 'diversity'], threshold: 55 },
  {
    name: 'The Craftsman',
    requires: ['endurance', 'dedication'],
    threshold: 60,
  },
  {
    name: 'Chain Breaker',
    requires: ['consistency', 'aggression'],
    threshold: 65,
  },
  {
    name: 'The Relentless',
    requires: ['consistency', 'endurance', 'dedication'],
    threshold: 55,
  },
  {
    name: 'Momentum King',
    requires: ['velocity', 'consistency', 'aggression'],
    threshold: 60,
  },
  {
    name: 'Shadow Dev',
    requires: ['endurance', 'diversity', 'dedication'],
    threshold: 55,
  },
  {
    name: 'Void Walker',
    requires: ['aggression', 'endurance', 'velocity'],
    threshold: 65,
  },
];
const WEEKDAY_RULES = [
  {
    name: 'Iron Weekday',
    days: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'],
  },
  { name: 'Early Riser', days: ['sunday', 'monday'] },
  { name: 'Sunday Starter', days: ['sunday'] },
  { name: 'Monday Warrior', days: ['monday'] },
  { name: 'Midweek Machine', days: ['monday', 'tuesday', 'wednesday'] },
  { name: 'Hump Day Hero', days: ['wednesday'] },
  { name: 'End Rusher', days: ['thursday', 'weekend'] },
  { name: 'Weekend Warrior', days: ['weekend'] },
  { name: 'The Finisher', days: ['thursday'] },
];

// Returns the XP required to complete a single level (not cumulative).
function xpForLevel(level) {
  const tier = TIERS.find((t) => level >= t.from && level <= t.to);
  const levelInTier = level - tier.from;
  return Math.floor(tier.base * Math.pow(tier.growth, levelInTier));
}

// Returns the level corresponding to a cumulative XP total.
function levelFromXp(totalXp) {
  let accumulated = 0;

  for (let lvl = 1; lvl <= 100; lvl++) {
    accumulated += xpForLevel(lvl);
    if (totalXp < accumulated) return lvl;
  }

  return 100;
}

function getVelocity(totalXP, totalEntries, entriesLastWeek) {
  const rawVelocity =
    (totalXP / totalEntries) * (1 + entriesLastWeek / totalEntries);
  return Math.min(100, (rawVelocity / 500) * 100);
}
function getEndurance(totalDuration, totalEntries, acceptedEntries) {
  const acceptanceRate = acceptedEntries / totalEntries;
  const avgDuration = totalDuration / totalEntries;
  return Math.min(100, (avgDuration / 120) * 100 * acceptanceRate);
}
function getDiversity(entriesActivity) {
  return (entriesActivity / 24) * 100;
}
function getDedication(quests) {
  let weightedCompleted = 0;
  let weightedTotal = 0;
  for (const progress of quests) {
    // 1. Defuse the landmine
    if (!progress.quest) {
      continue;
    }

    // 2. Prove the good data exists
    const weight =
      progress.quest.difficulty === 'easy'
        ? 1
        : progress.quest.difficulty === 'medium'
          ? 1.75
          : progress.quest.difficulty === 'hard'
            ? 3
            : 5;
    weightedTotal += weight;
    if (progress.completed) weightedCompleted += weight;
  }
  return (weightedCompleted / Math.max(weightedTotal, 1)) * 100;
}
function getAggression() {
  //TODO
  return 50;
}
function getConsistency(streak, daysActive, totalSeasonDays) {
  const streakComponent = Math.min(40, streak * 0.4);
  const activeRatio = daysActive / Math.max(totalSeasonDays, 1);
  return streakComponent + activeRatio * 60;
}

// ── Hooks ─────────────────────────────────────────────────

// Filter out deactivated users from all find queries automatically.
userModel.methods.selectAttribute = async function () {
  const entries = await Entry.find({ user: this._id });
  const leagueProgress = await LeagueUserProgress.findOne({ user: this._id });
  if (!leagueProgress) return;
  const season = await LeagueSeason.findById(leagueProgress.leagueSeason);
  if (!season) return;
  const questProgress = await QuestProgress.find({ user: this._id });
  const seasonDays = Math.floor(
    (Date.now() - season.startDate) / (1000 * 60 * 60 * 24),
  );
  let questList = [];
  for (const progress of questProgress) {
    await progress.populate('quest');
    questList.push(progress);
  }
  const entriesActivity = await Entry.distinct('activity', { user: this._id });
  const acceptedEntries = await Entry.find({ user: this._id, accepted: true });
  const entriesThisWeek = await Entry.find({
    user: this._id,
    endDate: { $gte: Date.now() - 1000 * 60 * 60 * 24 * 7 },
  });
  let entriesDuration = 0;
  for (const entry of entries) {
    entriesDuration += entry.duration;
  }
  const velocity = getVelocity(this.XP, entries.length, entriesThisWeek.length);
  const endurance = getEndurance(
    entriesDuration,
    entries.length,
    acceptedEntries.length,
  );
  const diversity = getDiversity(entriesActivity.length);
  const dedication = getDedication(questList);
  const aggression = getAggression();
  const consistency = getConsistency(
    this.streak,
    leagueProgress.daysActive,
    seasonDays,
  );

  const scores = {
    velocity,
    endurance,
    diversity,
    dedication,
    aggression,
    consistency,
  };

  const maxScore = Math.max(...Object.values(scores));
  if (maxScore < 20) {
    this.attribute = 'Apprentice';
    return;
  }

  const matched = ATTRIBUTE_RULES.find((rule) =>
    rule.requires.every((r) => scores[r] >= rule.threshold),
  );
  this.consistencyScore = Math.floor(consistency);
  this.attribute = matched ? matched.name : 'Apprentice';
  await this.save({ validateBeforeSave: false });
};
userModel.methods.selectStreakAttribute = async function () {
  const entries = await Entry.find({ user: this._id });
  if (!entries.length) {
    this.streakAttribute = 'Drifter';
    return;
  }
  let weekEntries = {
    sunday: 0,
    monday: 0,
    tuesday: 0,
    wednesday: 0,
    thursday: 0,
    weekend: 0,
  };

  for (const entry of entries) {
    let entryDay = new Date(entry.endDate)
      .toLocaleDateString('en-US', { weekday: 'long' })
      .toLowerCase();
    if (entryDay === 'friday' || entryDay === 'saturday') entryDay = 'weekend';
    weekEntries[entryDay] += 1;
  }

  const average =
    Object.values(weekEntries).reduce((a, b) => a + b, 0) /
    Object.keys(weekEntries).length;

  const matched = WEEKDAY_RULES.find((rule) =>
    rule.days.every((day) => weekEntries[day] >= average * 1.3),
  );

  this.streakAttribute = matched ? matched.name : 'Drifter';
  await this.save({ validateBeforeSave: false });
};
userModel.pre(/^find/, function () {
  this.find({ active: { $ne: false } });
});

userModel.pre('save', async function () {
  if (!this.isModified('warRequest')) return;
  const requestedWar = await War.findOne({
    challenger: this.warRequest.from,
    status: 'pending',
    request: 'pending',
  });
  if (!requestedWar) return;

  if (this.warRequest.decision === 'accepted') {
    requestedWar.status = 'active';
    requestedWar.request = 'accepted';
    await requestedWar.save();
  } else if (this.warRequest.decision === 'rejected') {
    requestedWar.status = 'canceled';
    requestedWar.request = 'rejected';
    await requestedWar.save();
  }
});

userModel.pre('save', function () {
  if (!this.isModified('battlesPlayed') || !this.isModified('warsPlayed'))
    return;
  this.battlesWinPercentage = Math.floor(
    (this.battlesWon * 100) / this.battlesPlayed,
  );
  this.warsWinPercentage = Math.floor((this.warsWon * 100) / this.warsPlayed);
});

userModel.pre('save', function () {
  if (!this.isModified('coins')) return;
  if (this.coins <= -1000) {
    this.XP = 0;
    this.syntaxForces = 0;
    this.level = 0;
    this.streak = 0;
  }
});

userModel.pre('save', async function () {
  if (!this.isModified('streak')) return;
  const runningSeason = await LeagueSeason.findOne({
    league: this.league,
    status: 'running',
  });
  if (!runningSeason) return;
  const battle = await Battle.findOne({
    status: 'active',
    league: this.league,
    leagueSeason: runningSeason._id,
    $or: [{ playerOne: this._id }, { playerTwo: this._id }],
  });
  const war = await War.findOne({
    status: 'active',
    league: this.league,
    leagueSeason: runningSeason._id,
    $or: [{ challenger: this._id }, { opponent: this._id }],
  });
  if (battle) {
    battle.playerOneProgress = battle.playerOneProgress || {
      XP: 0,
      syntaxForces: 0,
      rankGained: 0,
      levelGained: 0,
      streak: 0,
    };
    battle.playerTwoProgress = battle.playerTwoProgress || {
      XP: 0,
      syntaxForces: 0,
      rankGained: 0,
      levelGained: 0,
      streak: 0,
    };
    if (battle.playerOne.equals(this._id)) {
      battle.playerOneProgress.streak += 1;
    } else {
      battle.playerTwoProgress.streak += 1;
    }
    await battle.save();
  }
  if (war) {
    war.challengerProgress = war.challengerProgress || {
      XP: 0,
      syntaxForces: 0,
      rankGained: 0,
      levelGained: 0,
      streak: 0,
    };
    war.opponentProgress = war.opponentProgress || {
      XP: 0,
      syntaxForces: 0,
      rankGained: 0,
      levelGained: 0,
      streak: 0,
    };
    if (war.challenger.equals(this._id)) {
      war.challengerProgress.streak += 1;
    } else {
      war.opponentProgress.streak += 1;
    }
    await war.save();
  }
});

// Recalculate level whenever XP is modified and saved.
userModel.pre('save', async function () {
  if (!this.isModified('XP')) return;

  const lvl = levelFromXp(this.XP);
  const previousLevel = this.level;
  this.level = lvl;
  const currentLevel = lvl;

  const questProgress = await QuestProgress.find({ user: this._id });
  if (questProgress.length === 0) return;

  for (const quest of questProgress) {
    if (quest.expiresAt > Date.now()) {
      if (quest.progressType === 'rank') {
        quest.progress += currentLevel - previousLevel;
      }
      await quest.save(); // Now safely awaited!
    }
  }
  const runningSeason = await LeagueSeason.findOne({
    league: this.league,
    status: 'running',
  });
  if (!runningSeason) return;
  const battle = await Battle.findOne({
    status: 'active',
    league: this.league,
    leagueSeason: runningSeason._id,
    $or: [{ playerOne: this._id }, { playerTwo: this._id }],
  });

  const war = await War.findOne({
    status: 'active',
    league: this.league,
    leagueSeason: runningSeason._id,
    $or: [{ challenger: this._id }, { opponent: this._id }],
  });
  if (battle) {
    battle.playerOneProgress = battle.playerOneProgress || {
      XP: 0,
      syntaxForces: 0,
      rankGained: 0,
      levelGained: 0,
      streak: 0,
    };
    battle.playerTwoProgress = battle.playerTwoProgress || {
      XP: 0,
      syntaxForces: 0,
      rankGained: 0,
      levelGained: 0,
      streak: 0,
    };
    if (battle.playerOne.equals(this._id)) {
      battle.playerOneProgress.level += currentLevel - previousLevel;
    } else {
      battle.playerTwoProgress.level += currentLevel - previousLevel;
    }
    await battle.save();
  }
  if (war) {
    war.challengerProgress = war.challengerProgress || {
      XP: 0,
      syntaxForces: 0,
      rankGained: 0,
      levelGained: 0,
      streak: 0,
    };
    war.opponentProgress = war.opponentProgress || {
      XP: 0,
      syntaxForces: 0,
      rankGained: 0,
      levelGained: 0,
      streak: 0,
    };
    if (war.challenger.equals(this._id)) {
      war.challengerProgress.level += 1;
    } else {
      war.opponentProgress.level += 1;
    }
    await war.save();
  }
});

// Enable validators when XP is updated via findOneAndUpdate.
userModel.pre('findOneAndUpdate', function () {
  const update = this.getUpdate();
  if (!update?.$inc?.XP && update?.XP == null) return;

  this.setOptions({ runValidators: true });
});

// Hash password on create or whenever password is changed.
// Also clears confirmPassword (never stored) and backdates passwordChangedAt
// by 1 second to ensure tokens issued before the change are invalidated.
userModel.pre('save', async function () {
  // IF password wasn't modified or created pass!
  if (!this.isModified('password')) return;

  // HASH password
  const hashedPassword = await bcrypt.hash(this.password, 12);

  this.password = hashedPassword;
  this.confirmPassword = undefined;
  // Subtract 1 second so tokens issued at the same millisecond as the change
  // are still considered "before the change" by passwordChangedAfter().
  this.passwordChangedAt = Date.now() - 1000;
});

// On new user creation: initialize their LeagueUserProgress for the running season.
// If no season is currently running, the progress record is skipped silently.
userModel.pre('save', async function () {
  if (!this.isNew) return; // only run for new users

  const userLeague = await League.findById(this.league);
  if (!userLeague) return;

  const runningSeason = await LeagueSeason.findOne({
    league: userLeague._id,
    status: 'running',
  });
  if (!runningSeason) return;

  await LeagueUserProgress.create({
    leagueSeason: runningSeason._id,
    user: this._id,
    XP: 0,
    syntaxForces: 0,
    daysActive: 0,
    // rank is not set here — recalculateRanks will assign it at the next cron run.
  });
});

// Check and handle subscription expiry on every user save.
userModel.pre('save', async function () {
  if (this.subscriptionEnd && this.subscriptionEnd.getTime() <= Date.now()) {
    await this.constructor.updateOne(
      { _id: this._id },
      {
        subscriptionStatus: 'past_due',
        subscription: new mongoose.Types.ObjectId('698c14edc11867bb93b50800'),
      },
    );
  }
});

// ── Methods ───────────────────────────────────────────────

// Compares a plaintext candidate password against the stored bcrypt hash.
userModel.methods.comparePasswords = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

// Returns true if the password was changed after the JWT was issued.
// Used in protect() to invalidate old tokens after a password change.
userModel.methods.passwordChangedAfter = function (JWTTimestamp) {
  if (!this.passwordChangedAt) return false;

  return this.passwordChangedAt.getTime() / 1000 > JWTTimestamp;
};

// Generates and stores a 6-digit password reset code with a 10-minute expiry.
// Does NOT save — the caller is responsible for calling user.save().
userModel.methods.createPasswordCode = function () {
  const resetCode = crypto.randomInt(100000, 1000000);
  this.passwordResetCode = resetCode;
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
};

const User = model('User', userModel);

module.exports = User;
