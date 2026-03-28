const PERFECT_NUMBERS = [
  1, 2, 3, 5, 10, 15, 20, 25, 30, 40, 50, 75, 100, 150, 200, 250, 300, 400, 500,
  750, 1000, 1500, 2000, 2500, 3000, 5000, 7500, 10000, 15000, 20000, 25000,
  50000, 100000,
];

function roundToPerfect(value) {
  return PERFECT_NUMBERS.reduce((prev, curr) =>
    Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev,
  );
}
const OBJECTIVE_BASE = {
  entries: {
    daily: { base: 1, growth: 1.08 },
    seasonal: { base: 20, growth: 1.15 },
  },
  XP: {
    daily: { base: 100, growth: 1.3 },
    seasonal: { base: 2000, growth: 1.4 },
  },
  syntaxForces: {
    daily: { base: 5, growth: 1.25 },
    seasonal: { base: 50, growth: 1.35 },
  },
  rank: {
    daily: { base: 50, growth: 0.9 },
    seasonal: { base: 40, growth: 0.85 },
  },
  level: {
    daily: { base: 1, growth: 1.05 },
    seasonal: { base: 3, growth: 1.1 },
  },
  battles: {
    daily: { base: 1, growth: 1.1 },
    seasonal: { base: 3, growth: 1.2 },
  },
  war: {
    daily: { base: 1, growth: 1.05 },
    seasonal: { base: 2, growth: 1.1 },
  },
  project: {
    daily: { base: 1, growth: 1.0 },
    seasonal: { base: 1, growth: 1.05 },
  },
};

function calcObjective(objectiveType, leagueOrder, frequency) {
  const { base, growth } = OBJECTIVE_BASE[objectiveType][frequency];
  const raw = base * Math.pow(growth, leagueOrder - 1);
  return roundToPerfect(raw);
}

module.exports = { OBJECTIVE_BASE, calcObjective };
