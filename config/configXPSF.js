// Max XP for a single entry
const MAX_XP = 5000;
const MAX_SF = 50;

// Max entries per day
const MAX_ENTRIES_PER_DAY = 5;

// Type multipliers — project work is rewarded more than exercises.
const TYPE_MULTIPLIERS = {
  project: 1.2,
  miniProject: 0.6,
  exercise: 0.4,
};

// Activity multipliers — high-value cognitive activities score higher.
// Each key must exactly match an activity enum value in entryModel.js.
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

  // Problem solving — highest multipliers in the system
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

// 1 SF per 100 XP earned
const SF_PER_XP = 0.01;

// Minimum XP granted per completed entry regardless of duration or multipliers
const MIN_XP = 50;

// Base XP cap for the exponential growth curve (before multipliers)
const BASE_CAP = 3500;

// Growth rate for the exponential curve — higher = steeper gains at shorter durations
const GROWTH_RATE = 0.018;

// ── calculateXPSF ─────────────────────────────────────────
// Core XP formula:
//   baseXP = BASE_CAP * (1 - e^(-GROWTH_RATE * duration))
//   This is a saturation curve: fast growth at first, tapering off near BASE_CAP.
//   With GROWTH_RATE=0.018 and BASE_CAP=3500, 120 min ≈ 2690 base XP.
//
// dailyFactor applies diminishing returns for multiple entries in a day:
//   Entry 1: 1.0, Entry 2: 0.88, Entry 3: 0.76, Entry 4: 0.64, Entry 5+: 0.6 (floor)
//
// numEntry is the number of entries already logged today (0-indexed from countTodayEntries).

function calculateXPSF(type, activity, duration, numEntry) {
  const typeMultiplier = TYPE_MULTIPLIERS[type] || 1;
  const activityMultiplier = ACTIVITY_MULTIPLIERS[activity] || 1;

  // Exponential growth curve
  const baseXP = BASE_CAP * (1 - Math.exp(-GROWTH_RATE * duration));

  // Daily diminishing returns
  const dailyFactor = Math.max(0.6, 1 - 0.12 * numEntry);

  const xp = baseXP * typeMultiplier * activityMultiplier * dailyFactor;

  const finalXP = Math.max(MIN_XP, Math.round(xp));

  const sf = Math.round(finalXP * SF_PER_XP);

  return { xp: finalXP, sf };
}

module.exports = {
  calculateXPSF,
  MAX_ENTRIES_PER_DAY,
  MIN_XP,
  MAX_XP,
  MAX_SF,
};
