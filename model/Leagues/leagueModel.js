const { model, Schema } = require('mongoose');

const leagueSchema = new Schema({
  name: {
    type: String,
    required: [true, 'The league must have a name!'],
    enum: [
      'Bronze',
      'Silver',

      // Gold tiers
      'GoldI',
      'GoldII',

      // Cuprite tiers
      'CupriteI',
      'CupriteII',
      'CupriteIII',

      // Obsidian tiers
      'ObsidianI',
      'ObsidianII',
      'ObsidianIII',

      // Diamond tiers
      'DiamondI',
      'DiamondII',
      'DiamondIII',

      // Uranium tiers
      'UraniumI',
      'UraniumII',
      'UraniumIII',

      // Aetherium tiers
      'AetheriumI',
      'AetheriumII',
      'AetheriumIII',
      'AetheriumIV',
    ],
  },
  descritpion: {
    type: String,
    required: [true, 'The league must have a description!'],
  },
  icon: {
    type: String, // icon key
    required: true,
  },

  order: {
    type: Number, // ranking order
    required: true,
  },
});

const League = model('League', leagueSchema);

module.exports = League;
