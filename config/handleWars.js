const User = require('../model/User/userModel');
const LeagueUserProgress = require('../model/Leagues/leagueUserProgress');
const War = require('../model/Leagues/leagueWars');

async function warRequest() {
  const wars = await War.find({
    request: 'pending',
    endDate: { $lte: Date.now() },
  });
  if (!wars || wars.length === 0) return;

  for (const war of wars) {
    if (war.requestExpiresAt <= Date.now())
      await War.deleteOne({ _id: war._id });
  }
}

async function endWars() {
  const wars = await War.find({
    status: 'active',
    endDate: { $lte: Date.now() },
  });
  if (!wars || wars.length === 0) return;

  for (const war of wars) {
    if (war.status === 'finished') continue;
    const challengerLeagueProgress = await LeagueUserProgress.findOne({
      user: war.challenger,
      leagueSeason: war.leagueSeason,
    });
    const opponentLeagueProgress = await LeagueUserProgress.findOne({
      user: war.opponent,
      leagueSeason: war.leagueSeason,
    });
    if (!challengerLeagueProgress || !opponentLeagueProgress) continue;

    let challengerPoint = 0;
    let opponentPoint = 0;

    // ===== WAR STAT COMPARISONS =====
    if (war.challengerProgress.XP > war.opponentProgress.XP)
      challengerPoint += 2;
    else if (war.challengerProgress.XP < war.opponentProgress.XP)
      opponentPoint += 2;

    if (war.challengerProgress.syntaxForces > war.opponentProgress.syntaxForces)
      challengerPoint += 3;
    else if (
      war.challengerProgress.syntaxForces < war.opponentProgress.syntaxForces
    )
      opponentPoint += 3;

    if (war.challengerProgress.rankGained > war.opponentProgress.rankGained)
      challengerPoint += 3;
    else if (
      war.challengerProgress.rankGained < war.opponentProgress.rankGained
    )
      opponentPoint += 3;

    if (war.challengerProgress.levelGained > war.opponentProgress.levelGained)
      challengerPoint += 1;
    else if (
      war.challengerProgress.levelGained < war.opponentProgress.levelGained
    )
      opponentPoint += 1;

    if (war.challengerProgress.streak > war.opponentProgress.streak)
      challengerPoint += 1;
    else if (war.challengerProgress.streak < war.opponentProgress.streak)
      opponentPoint += 1;

    war.finalScore = war.finalScore || {};
    war.finalScore.challenger = challengerPoint;
    war.finalScore.opponent = opponentPoint;

    // ===== UPDATE USERS =====
    const challenger = await User.findById(war.challenger);
    const opponent = await User.findById(war.opponent);
    if (!challenger || !opponent) continue;

    if (challengerPoint > opponentPoint) {
      war.winner = war.challenger;

      const rewardSF = war.challengerReward?.syntaxForces || 0;
      const rewardCoins = war.challengerReward?.coins || 0;

      challenger.syntaxForces += rewardSF;
      opponent.syntaxForces = Math.max(0, opponent.syntaxForces - rewardSF);
      challengerLeagueProgress.syntaxForces += rewardSF;
      opponentLeagueProgress.syntaxForces = Math.max(
        0,
        opponentLeagueProgress.syntaxForces - rewardSF,
      );

      challenger.coins += rewardCoins;
      opponent.coins -= rewardCoins;
      challenger.warsWon += 1;
    } else if (challengerPoint < opponentPoint) {
      war.winner = war.opponent;
      const rewardSF = war.opponentReward?.syntaxForces || 0;
      const rewardCoins = war.opponentReward?.coins || 0;
      opponent.syntaxForces += rewardSF;
      challenger.syntaxForces = Math.max(0, challenger.syntaxForces - rewardSF);
      challengerLeagueProgress.syntaxForces = Math.max(
        0,
        challengerLeagueProgress.syntaxForces - rewardSF,
      );

      opponent.coins += rewardCoins;
      challenger.coins -= rewardCoins;
      opponent.warsWon += 1;
    } else {
      war.winner = null; // tie
    }

    war.status = 'finished';

    // ⚡ SAVE EVERYTHING
    await war.save();
    await challenger.save();
    await opponent.save();
    await challengerLeagueProgress.save();
    await opponentLeagueProgress.save();
  }
}

module.exports = { endWars, warRequest };
