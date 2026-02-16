const { model, Schema } = require('mongoose');

const leagueSchema = new Schema({
  name: {
    type: String,
    required: [true, 'The league must have a name!'],
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
