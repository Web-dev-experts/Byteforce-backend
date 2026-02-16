const { model, Schema, Types } = require('mongoose');
const mongoose = require('mongoose');
const { isStrongPassword } = require('validator');
const isEmail = require('validator/lib/isEmail');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const LeagueSeason = require('../../model/Leagues/leagueSeasonModel');
const League = require('../../model/Leagues/leagueModel');
const LeagueUserProgress = require('../../model/Leagues/leagueUserProgress');
const Subscription = require('../../model/pricing/pricingModel');

const userModel = new Schema(
  {
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },

    githubId: {
      type: String,
      unique: true,
      sparse: true,
    },

    authProvider: {
      type: String,
      enum: ['local', 'google', 'github'],
      default: 'local',
    },

    emailVerified: {
      type: Boolean,
      default: false,
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
      default: new Types.ObjectId('6979e647c7691f1ffa453aae'),
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
    role: {
      type: String,
      default: 'user',
      enum: ['user', 'admin'],
    },
    subscription: {
      type: Schema.Types.ObjectId,
      ref: 'Subscription',
      default: new mongoose.Types.ObjectId('698c14edc11867bb93b50800'),
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
    active: { type: Boolean, default: true, select: false },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

const TIERS = [
  { from: 1, to: 25, base: 1_000, growth: 1.08 },
  { from: 26, to: 50, base: 10_000, growth: 1.1 },
  { from: 51, to: 75, base: 80_000, growth: 1.12 },
  { from: 76, to: 89, base: 300_000, growth: 1.14 },
  { from: 90, to: 100, base: 900_000, growth: 1.18 },
];

function xpForLevel(level) {
  const tier = TIERS.find((t) => level >= t.from && level <= t.to);
  const levelInTier = level - tier.from;
  return Math.floor(tier.base * Math.pow(tier.growth, levelInTier));
}

function totalXpForLevel(targetLevel) {
  let total = 0;
  for (let lvl = 1; lvl < targetLevel; lvl++) {
    total += xpForLevel(lvl);
  }
  return total;
}

function levelFromXp(totalXp) {
  let accumulated = 0;

  for (let lvl = 1; lvl <= 100; lvl++) {
    accumulated += xpForLevel(lvl);
    if (totalXp < accumulated) return lvl;
  }

  return 100;
}

userModel.pre(/^find/, function () {
  this.find({ active: { $ne: false } });
});

userModel.pre('save', function () {
  if (!this.isModified('XP')) return;

  const lvl = levelFromXp(this.XP);
  this.level = lvl;
});

userModel.pre('findOneAndUpdate', function () {
  const update = this.getUpdate();
  if (!update?.$inc?.XP && update?.XP == null) return;

  this.setOptions({ runValidators: true });
  next();
});

userModel.pre('save', async function () {
  // IF user isn't new!
  if (!this.isNew) return;

  // create the code!
  const emailCode = crypto.randomInt(100000, 1000000);

  // code is created & set emailVerificationCode to this code
  this.emailVerificationExpires = Date.now() + 10 * 60 * 1000;
  this.emailVerificationCode = emailCode;
});

userModel.pre('save', async function () {
  // IF password wasn't modified or created pass!
  if (!this.isModified('password')) return;

  // HASH password
  const hashedPassword = await bcrypt.hash(this.password, 12);

  this.password = hashedPassword;
  this.confirmPassword = undefined;
  this.passwordChangedAt = Date.now() - 1000;
});

userModel.pre('save', async function () {
  if (!this.isNew) return; // only run for new users

  const userLeague = await League.findById(this.league);
  if (!userLeague) return;

  const usersCount = await this.constructor.countDocuments({
    league: userLeague._id,
  });

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
  });
});

userModel.pre('save', async function () {
  const userSubscription = await Subscription.findById(this.subscription);
  if (!userSubscription) return;

  if (userSubscription.endDate && userSubscription.endDate <= Date.now()) {
    userSubscription.status = 'expired';
    userSubscription.status = 'free';
    await userSubscription.save({ validateBeforeSave: false });
  }
});

userModel.methods.comparePasswords = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

userModel.methods.passwordChangedAfter = function (JWTTimestamp) {
  if (!this.passwordChangedAt) return false;

  return this.passwordChangedAt.getTime() / 1000 > JWTTimestamp;
};

userModel.methods.createPasswordCode = function () {
  const resetCode = crypto.randomInt(100000, 1000000);
  this.passwordResetCode = resetCode;
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
};

const User = model('User', userModel);

module.exports = User;
