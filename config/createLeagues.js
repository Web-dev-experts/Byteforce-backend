require('dotenv').config();
const mongoose = require('mongoose');
const League = require('../model/Leagues/leagueModel');

// League definitions — order maps directly to progression sequence.
const LEAGUES = [
  {
    name: 'Bronze',
    description:
      'The starting ground. Learning basics, building consistency, and forming habits.',
    icon: 'https://res.cloudinary.com/de4wvhtgq/image/upload/v1774466172/Bronze_xrxxdo.png',
    order: 1,
  },
  {
    name: 'Silver',
    description:
      'Momentum begins here. You understand fundamentals and start applying them regularly.',
    icon: 'https://res.cloudinary.com/de4wvhtgq/image/upload/v1774466413/Silver_tfqt9c.png',
    order: 2,
  },
  {
    name: 'GoldI',
    description:
      'Solid execution. You can complete real tasks with guidance and structure.',
    icon: 'https://res.cloudinary.com/de4wvhtgq/image/upload/v1774466412/GoldI_fndw1l.png',
    order: 3,
  },
  {
    name: 'GoldII',
    description:
      'Refined skills. You solve problems independently and contribute meaningful work.',
    icon: 'https://res.cloudinary.com/de4wvhtgq/image/upload/v1774466412/GoldII_rpsipu.png',
    order: 4,
  },
  {
    name: 'CupriteI',
    description:
      'Transition phase. You move from learning to producing value consistently.',
    icon: 'https://res.cloudinary.com/de4wvhtgq/image/upload/v1774466411/cupriteI_pmqvqf.png',
    order: 5,
  },
  {
    name: 'CupriteII',
    description:
      'Efficiency matters now. You optimize workflows and reduce mistakes.',
    icon: 'https://res.cloudinary.com/de4wvhtgq/image/upload/v1774466411/cupriteII_mn3dhx.png',
    order: 6,
  },
  {
    name: 'CupriteIII',
    description:
      'Strong reliability. You deliver results with minimal supervision.',
    icon: 'https://res.cloudinary.com/de4wvhtgq/image/upload/v1774466411/cuprite_III_z8czfk.png',
    order: 7,
  },
  {
    name: 'ObsidianI',
    description:
      'Advanced problem solver. You handle complexity and edge cases confidently.',
    icon: 'https://res.cloudinary.com/de4wvhtgq/image/upload/v1774466413/ObsidianI_lcufdw.png',
    order: 8,
  },
  {
    name: 'ObsidianII',
    description:
      'High-impact contributor. Your decisions affect systems, not just tasks.',
    icon: 'https://res.cloudinary.com/de4wvhtgq/image/upload/v1774466412/ObsidianII_podylk.png',
    order: 9,
  },
  {
    name: 'ObsidianIII',
    description:
      'Elite execution. You combine speed, quality, and depth consistently.',
    icon: 'https://res.cloudinary.com/de4wvhtgq/image/upload/v1774466413/ObsidianIII_o0vua9.png',
    order: 10,
  },
  {
    name: 'DiamondI',
    description:
      'System-level thinker. You design, refactor, and improve architectures.',
    icon: 'https://res.cloudinary.com/de4wvhtgq/image/upload/v1774466411/DiamondI_v0ma9f.png',
    order: 11,
  },
  {
    name: 'DiamondII',
    description:
      'Precision and mastery. You anticipate issues before they happen.',
    icon: 'https://res.cloudinary.com/de4wvhtgq/image/upload/v1774466411/DiamondII_n2gxxs.png',
    order: 12,
  },
  {
    name: 'DiamondIII',
    description:
      'Top-tier performance. You operate at a professional senior level.',
    icon: 'https://res.cloudinary.com/de4wvhtgq/image/upload/v1774466412/DiamondIII_eiqz9f.png',
    order: 13,
  },
  {
    name: 'UraniumI',
    description:
      'Strategic mindset. You balance long-term vision with execution.',
    icon: 'https://res.cloudinary.com/de4wvhtgq/image/upload/v1774466413/UraniumI_juisyz.png',
    order: 14,
  },
  {
    name: 'UraniumII',
    description:
      'Leadership through action. Others learn by following your patterns.',
    icon: 'https://res.cloudinary.com/de4wvhtgq/image/upload/v1774466414/UraniumII_roqmda.png',
    order: 15,
  },
  {
    name: 'UraniumIII',
    description:
      'Authority in your domain. You set standards, not just follow them.',
    icon: 'https://res.cloudinary.com/de4wvhtgq/image/upload/v1774466414/UraniumIII_e0o97d.png',
    order: 16,
  },
  {
    name: 'AetheriumI',
    description:
      'Exceptional consistency. Performance remains high under pressure.',
    icon: 'https://res.cloudinary.com/de4wvhtgq/image/upload/v1774466410/AetheriumI_dhle56.png',
    order: 17,
  },
  {
    name: 'AetheriumII',
    description: 'Near-elite mastery. You push limits and redefine efficiency.',
    icon: 'https://res.cloudinary.com/de4wvhtgq/image/upload/v1774466411/AetheriumII_rmwiyy.png',
    order: 18,
  },
  {
    name: 'AetheriumIII',
    description: 'Top 1% execution. Your work scales, lasts, and inspires.',
    icon: 'https://res.cloudinary.com/de4wvhtgq/image/upload/v1774466411/AetheriumIII_xd9jj6.png',
    order: 19,
  },
  {
    // NOTE-BUG💥 Inconsistent Naming Scheme.
    // Every other tier (e.g., GoldII, AetheriumIII) has NO SPACE between the word and the roman numeral.
    // This one has a space. If your User model or progression logic looks for strict string matches, this will fail.
    // FIX: Change 'Aetherium IV' to 'AetheriumIV'
    name: 'Aetherium IV',
    description:
      'Legend tier. Absolute mastery, discipline, and long-term dominance.',
    icon: 'https://res.cloudinary.com/de4wvhtgq/image/upload/v1774466410/AetheriumIV_wcbkre.png',
    order: 20,
  },
];

// Idempotent: if any leagues already exist in the DB, skip entirely.
// This means adding a new league requires manually running a migration —
// this function won't pick up new entries once the collection is populated.
// Idempotent: if any leagues already exist in the DB, skip entirely.
async function createLeaguesOnce() {
  try {
    const existing = await League.countDocuments();
    if (existing > 0) {
      console.log('Leagues already seeded, skipping...');
      return;
    }

    console.log('Seeding leagues to database...');

    // We don't need Cloudinary upload anymore since we have the URLs!
    for (let i = 0; i < LEAGUES.length; i++) {
      const league = LEAGUES[i];

      await League.create({
        name: league.name,
        description: league.description,
        icon: league.icon, // Saves the Cloudinary URL directly
        order: league.order,
      });
    }

    console.log('All 20 Leagues seeded successfully!');
  } catch (err) {
    console.error('Failed to seed leagues:', err);
    throw err; // Throws error so server.js can catch it and exit
  }
}

module.exports = createLeaguesOnce;
