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
    users: [
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
    entries: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Entry',
      },
    ],
  },
  {
    timestamps: true,
  },
);

projectSchema.pre('save', function () {
  this.latestActivity = new Date();
});

projectSchema.methods.finishProject = async function () {
  this.endDate = Date.now();
  this.status = 'finished';
};

const Project = model('Project', projectSchema);

module.exports = Project;
