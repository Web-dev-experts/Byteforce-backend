const { model, Schema } = require('mongoose');

const leagueSchema = new Schema({
  name: {
    type: String,
    required: [true, 'The league must have a name!'],
  },
  description: {
    type: String,
    required: [true, 'The league must have a description!'],
  },
  // icon is a Cloudinary URL stored after upload in createLeagues.js.
  icon: {
    type: String,
    required: true,
  },
  // order determines the progression sequence (1 = Bronze, 20 = AetheriumIV).
  // Used in endSeason to find next/previous leagues via order + 1 / order - 1.
  order: {
    type: Number,
    required: true,
  },
});

const League = model('League', leagueSchema);

module.exports = League;
