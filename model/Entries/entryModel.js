const LeagueSeason = require('../../model/Leagues/leagueSeasonModel');
const League = require('../../model/Leagues/leagueModel');
const LeagueUserProgress = require('../../model/Leagues/leagueUserProgress');
const { default: mongoose } = require('mongoose');
const { model, Schema } = require('mongoose');
const Project = require('./projectModel');
const Subscription = require('../../model/pricing/pricingModel');
const {
  calculateXPSF,
  MAX_ENTRIES_PER_DAY,
  MIN_XP,
  MAX_XP,
  MAX_SF,
} = require('../../config/configXPSF');
const verifyGithubCommit = require('../../utils/githubRepoVerify');
const QuestProgress = require('../../model/Quests/questProgressModel');
const Battle = require('../../model/Leagues/leagueBattles');
const War = require('../../model/Leagues/leagueWars');

// ── Schema ────────────────────────────────────────────────
// accepted: false means the entry was rejected (too short, too long,
// or daily limit exceeded). Rejected entries are hidden by default (select: false)
// and their XP/SF are either 0 or negative penalties.
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
        // Cross-field validation: 'project' type requires a linked projectId.
        validator: function (v) {
          if (v === 'project' && !this.projectId) return false;
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
        'watchingTutorial',
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
    accepted: { type: Boolean, default: true },
    repoUrl: { type: String },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// ── countTodayEntries ─────────────────────────────────────
// Returns the number of accepted entries the user has finished today.
// Used to enforce the daily entry cap and apply diminishing returns.
// "Today" is determined by midnight boundaries in the server's local timezone —
// users in different timezones may get a different reset time than expected.
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

// ── finishEntry ───────────────────────────────────────────
// The core method. Called when a user ends their session.
// Handles all edge cases: already finished, too many today, too short,
// too long (with penalty), then normal completion with XP/SF calculation.
//
// Flow:
//   1. Count today's entries
//   2. Guard: already finished?
//   3. Guard: daily limit exceeded? → reject, 0 XP
//   4. Calculate duration
//   5. Guard: < 1 min? → reject, 0 XP
//   6. Guard: > 240 min? → reject, penalty XP (-500 / -5 SF)
//   7. Cap duration at 120 min
//   8. Calculate XP/SF via configXPSF
//   9. Apply subscription XP bonus
//  10. Update user, leagueUserProgress, project
//  11. Recalculate ranks
entrySchema.methods.finishEntry = async function () {
  const User = mongoose.model('User');
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

  const user = await User.findById(this.user);
  if (!user) return;
  const userLeague = await League.findById(user.league);
  if (!userLeague) return;
  const questProgress = await QuestProgress.find({ user: user._id });
  const runningSeason = await LeagueSeason.findOne({
    league: userLeague._id,
    status: 'running',
  });
  if (!runningSeason) return;
  const leagueUserProgress = await LeagueUserProgress.findOne({
    user: this.user,
    leagueSeason: runningSeason._id,
  });
  if (!leagueUserProgress) return;
  const battle = await Battle.findOne({
    status: 'active',
    league: runningSeason.league,
    leagueSeason: runningSeason._id,
    $or: [{ playerOne: user._id }, { playerTwo: user._id }],
  });
  const war = await War.findOne({
    status: 'active',
    league: runningSeason.league,
    leagueSeason: runningSeason._id,
    $or: [{ challenger: user._id }, { opponent: user._id }],
  });
  // Too long entry (>4h) — penalizes the user with negative XP and SF
  if (!this.repoUrl || this.repoUrl.length === 0) {
    this.XPGranted = Math.floor(this.XPGranted / 2);
    this.SFGranted = Math.floor(this.SFGranted / 2);
  } else {
    let repoToCheck = this.repoUrl;
    if (this.type === 'project') {
      const project = await Project.findById(this.projectId);
      if (project.status !== 'finished') {
        repoToCheck = project ? project.repoUrl : this.repoUrl;
      }
    }
    const threshold =
      this.duration <= 30
        ? 20
        : this.duration > 30 && this.duration < 60
          ? 50
          : 100;
    const verified = await verifyGithubCommit(
      user.githubAccessToken,
      repoToCheck,
      this.startDate,
      this.endDate,
      threshold,
    );
    if (!verified) {
      this.XPGranted = Math.floor(this.XPGranted / 2);
      this.SFGranted = Math.floor(this.SFGranted / 2);
    }
  }
  if (Number(this.duration) > 240) {
    this.status = 'finished';
    this.accepted = false;
    this.XPGranted = -500;
    this.SFGranted = -5;

    // Guard added — if no season is running, skip the penalty application.
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
      if (battle.playerOne.equals(user._id)) {
        battle.playerOneProgress.XP += this.XPGranted;
        battle.playerOneProgress.syntaxForces += this.SFGranted;
      } else {
        battle.playerTwoProgress.XP += this.XPGranted;
        battle.playerTwoProgress.syntaxForces += this.SFGranted;
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
      if (war.challenger.equals(user._id)) {
        war.challengerProgress.XP += this.XPGranted;
        war.challengerProgress.syntaxForces += this.SFGranted;
      } else {
        war.opponentProgress.XP += this.XPGranted;
        war.opponentProgress.syntaxForces += this.SFGranted;
      }
      await war.save();
    }
    user.XP += this.XPGranted;
    user.syntaxForces += this.SFGranted;
    leagueUserProgress.XP += this.XPGranted;
    leagueUserProgress.syntaxForces += this.SFGranted;
    await user.selectAttribute();
    await user.selectStreakAttribute();
    await user.save();
    await leagueUserProgress.save();
    await LeagueUserProgress.recalculateRanks(runningSeason._id);
    const questProgress = await QuestProgress.find({ user: user._id });
    if (questProgress.length === 0) {
      await this.save();
      return;
    }
    for (const quest of questProgress) {
      if (quest.progressType === 'XP') quest.progress += this.XPGranted;
      if (quest.progressType === 'syntaxForces')
        quest.progress += this.SFGranted;
      await quest.save();
    }
    await this.save();
    return;
  }

  // Cap duration at 120 minutes for XP calculation purposes.
  // Sessions longer than 2h still count but are scored as if they were 2h.
  if (Number(this.duration) > 120) this.duration = 120;
  this.status = 'finished';

  // Calculate XP & SF for this entry
  const { xp, sf } = calculateXPSF(
    this.type,
    this.activity,
    this.duration,
    entriesThisDay,
  );
  if (!user) return;

  // Clamp XP & SF to min/max values defined in configXPSF
  const clampedXP = Math.min(MAX_XP, Math.max(MIN_XP, xp));
  const clampedSF = Math.min(MAX_SF, Math.max(0, sf));

  const subscription = await Subscription.findById(user.subscription);
  const bonus = subscription.XPBonus;

  this.XPGranted = Math.floor(clampedXP) * bonus;
  this.SFGranted = Math.floor(clampedSF);

  if (entriesThisDay >= 1 && this.duration > 1) {
    // Increment streak only on the first qualifying entry of the day (>= 30 min)
    user.streak += 1;
    await user.save();
  }

  // If the user has no progress record for this season, create one.
  // This can happen if a user joins mid-season.
  if (!leagueUserProgress) {
    const usersCount = await User.countDocuments({
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

  // Link this entry to its project and accumulate project-level XP/SF.
  const project = await Project.findById(this.projectId);
  if (project && this.projectId) {
    const project = await Project.findById(this.projectId);
    if (project.status !== 'finished') {
      project.entries.push(this._id);
      project.XPGained += this.XPGranted;
      project.SFGained += this.SFGranted;

      await project.save();
    }
  }
  await user.selectAttribute();
  await user.selectStreakAttribute();
  await user.save();
  await leagueUserProgress.save();
  // Recalculates the rank of every user in this season based on syntaxForces.
  const previousRank = leagueUserProgress.rank;
  await LeagueUserProgress.recalculateRanks(runningSeason._id);
  const currentRank = leagueUserProgress.rank;

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
    if (battle.playerOne.equals(user._id)) {
      battle.playerOneProgress.XP += this.XPGranted;
      battle.playerOneProgress.syntaxForces += this.SFGranted;
      battle.playerOneProgress.rankGained += currentRank - previousRank;
    } else {
      battle.playerTwoProgress.XP += this.XPGranted;
      battle.playerTwoProgress.syntaxForces += this.SFGranted;
      battle.playerTwoProgress.rankGained += currentRank - previousRank;
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
    if (war.challenger.equals(user._id)) {
      war.challengerProgress.XP += this.XPGranted;
      war.challengerProgress.syntaxForces += this.SFGranted;
      war.challengerProgress.rankGained += currentRank - previousRank;
    } else {
      war.opponentProgress.XP += this.XPGranted;
      war.opponentProgress.syntaxForces += this.SFGranted;
      war.opponentProgress.rankGained += currentRank - previousRank;
    }
    await war.save();
  }

  if (questProgress.length === 0) {
    await this.save();
    return;
  }

  for (const quest of questProgress) {
    if (quest.expiresAt > this.endDate) {
      if (quest.progressType === 'XP') quest.progress += this.XPGranted;
      if (quest.progressType === 'syntaxForces')
        quest.progress += this.SFGranted;
      if (quest.progressType === 'entries') quest.progress += 1;

      await quest.save(); // Now safely awaited!
    }
  }

  await this.save();
};

const Entry = model('Entry', entrySchema);

module.exports = Entry;
