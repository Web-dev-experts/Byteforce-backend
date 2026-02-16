require('dotenv').config();
const mongoose = require('mongoose');
const cloudinary = require('./config/cloudinary');
const League = require('./model/Leagues/leagueModel');
const path = require('path');

const LEAGUES = [
  {
    name: 'Bronze',
    description:
      'The starting ground. Learning basics, building consistency, and forming habits.',
    icon: 'bronzeI.svg',
    order: 1,
  },
  {
    name: 'Silver',
    description:
      'Momentum begins here. You understand fundamentals and start applying them regularly.',
    icon: 'silverI.svg',
    order: 2,
  },
  {
    name: 'GoldI',
    description:
      'Solid execution. You can complete real tasks with guidance and structure.',
    icon: 'GoldI.png',
    order: 3,
  },
  {
    name: 'GoldII',
    description:
      'Refined skills. You solve problems independently and contribute meaningful work.',
    icon: 'GoldII.png',
    order: 4,
  },
  {
    name: 'CupriteI',
    description:
      'Transition phase. You move from learning to producing value consistently.',
    icon: 'cupriteI.png',
    order: 5,
  },
  {
    name: 'CupriteII',
    description:
      'Efficiency matters now. You optimize workflows and reduce mistakes.',
    icon: 'cupriteII.png',
    order: 6,
  },
  {
    name: 'CupriteIII',
    description:
      'Strong reliability. You deliver results with minimal supervision.',
    icon: 'cupriteII.png',
    order: 7,
  },
  {
    name: 'ObsidianI',
    description:
      'Advanced problem solver. You handle complexity and edge cases confidently.',
    icon: 'ObsidianI.png',
    order: 8,
  },
  {
    name: 'ObsidianII',
    description:
      'High-impact contributor. Your decisions affect systems, not just tasks.',
    icon: 'ObsidianII.png',
    order: 9,
  },
  {
    name: 'ObsidianIII',
    description:
      'Elite execution. You combine speed, quality, and depth consistently.',
    icon: 'ObsidianIII.png',
    order: 10,
  },
  {
    name: 'DiamondI',
    description:
      'System-level thinker. You design, refactor, and improve architectures.',
    icon: 'DiamondI.png',
    order: 11,
  },
  {
    name: 'DiamondII',
    description:
      'Precision and mastery. You anticipate issues before they happen.',
    icon: 'DiamondII.png',
    order: 12,
  },
  {
    name: 'DiamondIII',
    description:
      'Top-tier performance. You operate at a professional senior level.',
    icon: 'DiamondIII.png',
    order: 13,
  },
  {
    name: 'Uranium',
    description:
      'Strategic mindset. You balance long-term vision with execution.',
    icon: 'UraniumI.png',
    order: 14,
  },
  {
    name: 'UraniumII',
    description:
      'Leadership through action. Others learn by following your patterns.',
    icon: 'UraniumII.png',
    order: 15,
  },
  {
    name: 'UraniumIII',
    description:
      'Authority in your domain. You set standards, not just follow them.',
    icon: 'UraniumIII.png',
    order: 16,
  },
  {
    name: 'AetheriumI',
    description:
      'Exceptional consistency. Performance remains high under pressure.',
    icon: 'AetheriumI.png',
    order: 17,
  },
  {
    name: 'AetheriumII',
    description: 'Near-elite mastery. You push limits and redefine efficiency.',
    icon: 'AetheriumII.png',
    order: 18,
  },
  {
    name: 'AetheriumIII',
    description: 'Top 1% execution. Your work scales, lasts, and inspires.',
    icon: 'AetheriumIII.png',
    order: 19,
  },
  {
    name: 'Aetherium IV',
    description:
      'Legend tier. Absolute mastery, discipline, and long-term dominance.',
    icon: 'AetheriumIV.png',
    order: 20,
  },
];

async function createLeaguesOnce() {
  const existing = await League.countDocuments();
  if (existing > 0) return;
  for (let i = 0; i < LEAGUES.length; i++) {
    const league = LEAGUES[i];
    const imagePath = path.join(__dirname, './public', league.icon);

    const uploaded = await cloudinary.uploader.upload(imagePath, {
      folder: 'leagues_logo',
    });

    await League.create({
      name: league.name,
      descritpion: league.description,
      order: league.order,
      icon: uploaded.secure_url,
    });
  }

  console.log('✅ Leagues created / verified');
}

module.exports = createLeaguesOnce;
