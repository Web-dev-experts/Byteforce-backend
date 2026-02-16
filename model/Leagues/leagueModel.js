const { model, Schema } = require('mongoose');

const leagueSchema = new Schema({
  name: {
    type: String,
    required: [true, 'The league must have a name!'],
    enum: [
      'Bronze',
      'Silver',

      // Gold tiers
      'Gold I',
      'Gold II',

      // Cuprite tiers
      'Cuprite I',
      'Cuprite II',
      'Cuprite III',

      // Obsidian tiers
      'Obsidian I',
      'Obsidian II',
      'Obsidian III',

      // Diamond tiers
      'Diamond I',
      'Diamond II',
      'Diamond III',

      // Uranium tiers
      'Uranium I',
      'Uranium II',
      'Uranium III',

      // Aetherium tiers
      'Aetherium I',
      'Aetherium II',
      'Aetherium III',
      'Aetherium IV',
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
