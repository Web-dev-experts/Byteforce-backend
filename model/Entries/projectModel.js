const QuestProgress = require('../../model/Quests/questProgressModel');
const { Schema, model } = require('mongoose');

const projectSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'The project must have a name'],
    },
    description: {
      type: String,
    },
    // users is an array of User ObjectIds — project members.
    // Used for ownership checks in delete/edit operations.
    users: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    leaders: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    languages: {
      type: [String],
      required: [true, 'The project must have languages'],
      enum: [
        // General-purpose
        'C',
        'C++',
        'C#',
        'Java',
        'Python',
        'Go',
        'Rust',
        'Swift',
        'Kotlin',
        'D',
        'Nim',
        'Zig',
        'Crystal',
        // Web
        'JavaScript',
        'TypeScript',
        'PHP',
        'Ruby',
        'Elixir',
        'Dart',
        // Functional
        'Haskell',
        'OCaml',
        'F#',
        'Erlang',
        'Scheme',
        'Racket',
        'Clojure',
        // Systems / Low-level
        'Assembly',
        'V',
        'Red',
        'Modula-2',
        // Data / Scientific
        'R',
        'Julia',
        'MATLAB',
        'Octave',
        'SAS',
        // Mobile
        'Objective-C',
        'Groovy',
        // Game / Scripting
        'Lua',
        'GDScript',
        'Haxe',
        // Enterprise / Legacy
        'COBOL',
        'Fortran',
        'Ada',
        'Pascal',
        'Delphi',
        // Shell / Automation
        'Bash',
        'PowerShell',
        'Zsh',
        'Fish',
        // Blockchain / Smart Contracts
        'Solidity',
        'Vyper',
        'Move',
        'Cairo',
        // Logic / Specialized
        'Prolog',
        'Smalltalk',
        'Io',
        'ReasonML',
      ],
    },
    banner: {
      type: String,
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
    // latestActivity is updated by the pre-save hook on every save.
    latestActivity: {
      type: Date,
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
    },
    expectedEndDate: {
      type: Date,
    },
    // XPGained and SFGained accumulate totals from all linked entries.
    XPGained: {
      type: Number,
      default: 0,
    },
    SFGained: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['finished', 'in_progress', 'paused', 'abandoned'],
      default: 'in_progress',
    },
    // entries is an array of Entry _ids linked to this project.
    // Populated by finishEntry() in entryModel.
    entries: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Entry',
      },
    ],
    difficulty: {
      type: Number,
      max: 100,
    },
    repoUrl: {
      type: String,
      unique: true,
      required: [true, 'The project must have a repo URL!'],
    },
  },
  {
    timestamps: true,
  },
);

// Updates latestActivity on every save — tracks when the project was last touched.
projectSchema.pre('save', function () {
  this.latestActivity = new Date();
});

// ── finishProject ─────────────────────────────────────────
// Sets endDate and status to 'finished'.
projectSchema.methods.finishProject = async function () {
  this.endDate = Date.now();
  this.status = 'finished';

  const users = this.users;
  for (const user of users) {
    const questProgress = await QuestProgress.find({ user: user._id });
    if (questProgress.length === 0) continue;
    for (const quest of questProgress) {
      if (quest.expiresAt > Date.now()) {
        if (quest.progressType === 'project') quest.progress += 1;
      }
      await quest.save();
    }
  }

  await this.save();
};

// ── Project difficulty ─────────────────────────────────────
const FIELD_DIFFICULTY = {
  algorithms: 15,
  artificialIntelligence: 15,
  machineLearning: 15,
  security: 15,
  dataStructures: 14,
  dataScience: 13,
  cloud: 12,
  devops: 12,
  databases: 11,
  backend: 10,
  mobile: 10,
  game: 10,
  fullstack: 9,
  computerScience: 8,
  automation: 7,
  frontend: 6,
  testing: 5,
  refactoring: 4,
  other: 3,
};
function getEntryScore(totalEntries) {
  return totalEntries <= 10
    ? 5
    : totalEntries <= 25
      ? 10
      : totalEntries <= 40
        ? 15
        : totalEntries <= 80
          ? 20
          : 25;
}
function getContribution(users) {
  if (users === 1) return 15;
  if (users === 2) return 10;
  if (users <= 4) return 6;
  if (users > 4) return 3;
  return 3;
}
function getConsistencyScore(entries, startDate, endDate) {
  const totalDays =
    Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24)) || 1;
  const uniqueDays = new Set(
    entries
      .filter((e) => e.endDate)
      .map((e) => new Date(e.endDate).toDateString()),
  );
  let totalDuration = 0;
  const totalDaysActive = uniqueDays.size;
  for (const entry of entries) {
    totalDuration += entry.duration;
  }
  const consistency = totalDaysActive / totalDays;
  return (totalDuration / 100) * 15 + consistency * 10;
}

projectSchema.pre('save', function () {
  if (!this.isModified('users') && !this.isModified('leaders')) return ;

  // 1. Ensure 'leaders' is an array
  if (!Array.isArray(this.leaders)) this.leaders = [];

  // 2. Filter 'leaders' to only include people who are actually in the 'users' array
  const userIds = this.users.map((id) => id.toString());

  this.leaders = this.leaders.filter((leaderId) =>
    userIds.includes(leaderId.toString()),
  );

  // 3. Fallback: If no valid leaders remain, pick one random person from 'users'
  if (this.leaders.length === 0 && this.users.length > 0) {
    this.leaders.push(
      this.users[Math.floor(Math.random() * this.users.length)],
    );
  }
});

projectSchema.pre('save', function () {
  const entryScore = getEntryScore(this.entries.length);
  const consistencyScore = getConsistencyScore(
    this.entries,
    this.startDate,
    this.endDate,
  );
  const XPScore = (this.XPGained / 100) * 20;
  const fieldScore =
    this.field.reduce((sum, f) => sum + (FIELD_DIFFICULTY[f] || 3), 0) /
    this.field.length;
  const contributionScore = getContribution(this.users.length);

  this.difficulty =
    entryScore + consistencyScore + XPScore + fieldScore + contributionScore;
});

const Project = model('Project', projectSchema);

module.exports = Project;
