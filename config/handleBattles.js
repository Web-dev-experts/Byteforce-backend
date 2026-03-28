const User = require('../model/User/userModel');
const Battle = require('../model/Leagues/leagueBattles');
const League = require('../model/Leagues/leagueModel');
const LeagueUserProgress = require('../model/Leagues/leagueUserProgress');
const LeagueSeason = require('../model/Leagues/leagueSeasonModel');

async function startBattles(leagueId) {
  const league = await League.findById(leagueId);
  if (!league) return;

  const leagueSeason = await LeagueSeason.findOne({
    league: leagueId,
    status: 'running',
  });
  if (!leagueSeason) return;

  const users = await User.find({ league: leagueId });
  if (users.length < 2) return;

  const week = 1000 * 60 * 60 * 24 * 7;
  let currentDate = leagueSeason.startDate.getTime();
  const endDate = leagueSeason.endDate.getTime();
  const battlesToCreate = [];

  while (currentDate + week <= endDate) {
    // 🔥 NEW MATCHMAKING EACH WEEK
    const shuffled = [...users].sort(() => Math.random() - 0.5);

    for (let i = 0; i < shuffled.length; i += 2) {
      const p1 = shuffled[i];
      const p2 = shuffled[i + 1];
      if (!p2) break;

      battlesToCreate.push({
        playerOne: p1._id,
        playerTwo: p2._id,
        league: league._id,
        leagueSeason: leagueSeason._id,
        startDate: new Date(currentDate),
        status: 'scheduled',
      });
    }

    currentDate += week;
  }

  if (battlesToCreate.length > 0) {
    await Battle.insertMany(battlesToCreate);
  }

  // ⚡ Activate scheduled battles if no active battles exist
  const activeBattles = await Battle.find({ status: 'active' });
  if (activeBattles.length === 0) {
    const scheduledBattles = await Battle.find({ status: 'scheduled' }).sort({
      startDate: -1,
    });
    for (const battle of scheduledBattles) {
      battle.status = 'active';
      await battle.save();
    }
  }
}

async function endBattles() {
  const battles = await Battle.find({
    status: 'active',
    endDate: { $lte: Date.now() },
  });
  if (!battles || battles.length === 0) return;

  for (const battle of battles) {
    const playerOneLeagueProgress = await LeagueUserProgress.findOne({
      user: battle.playerOne,
      leagueSeason: battle.leagueSeason,
    });
    const playerTwoLeagueProgress = await LeagueUserProgress.findOne({
      user: battle.playerTwo,
      leagueSeason: battle.leagueSeason,
    });
    if (!playerOneLeagueProgress || !playerTwoLeagueProgress) continue;

    let playerOnePoint = 0;
    let playerTwoPoint = 0;

    // ===== BATTLE STAT COMPARISONS =====
    if (battle.playerOneProgress.XP > battle.playerTwoProgress.XP)
      playerOnePoint += 2;
    else if (battle.playerOneProgress.XP < battle.playerTwoProgress.XP)
      playerTwoPoint += 2;

    if (
      battle.playerOneProgress.syntaxForces >
      battle.playerTwoProgress.syntaxForces
    )
      playerOnePoint += 3;
    else if (
      battle.playerOneProgress.syntaxForces <
      battle.playerTwoProgress.syntaxForces
    )
      playerTwoPoint += 3;

    if (
      battle.playerOneProgress.rankGained > battle.playerTwoProgress.rankGained
    )
      playerOnePoint += 3;
    else if (
      battle.playerOneProgress.rankGained < battle.playerTwoProgress.rankGained
    )
      playerTwoPoint += 3;

    if (
      battle.playerOneProgress.levelGained >
      battle.playerTwoProgress.levelGained
    )
      playerOnePoint += 1;
    else if (
      battle.playerOneProgress.levelGained <
      battle.playerTwoProgress.levelGained
    )
      playerTwoPoint += 1;

    if (battle.playerOneProgress.streak > battle.playerTwoProgress.streak)
      playerOnePoint += 1;
    else if (battle.playerOneProgress.streak < battle.playerTwoProgress.streak)
      playerTwoPoint += 1;

    battle.finalScore = battle.finalScore || {};
    battle.finalScore.playerOne = playerOnePoint;
    battle.finalScore.playerTwo = playerTwoPoint;

    // ===== UPDATE USERS =====
    const playerOne = await User.findById(battle.playerOne);
    const playerTwo = await User.findById(battle.playerTwo);
    if (!playerOne || !playerTwo) continue;

    if (playerOnePoint > playerTwoPoint) {
      battle.winner = battle.playerOne;
      const reward = battle.playerOneReward?.syntaxForces || 0;

      playerOne.syntaxForces += reward;
      playerTwo.syntaxForces = Math.max(0, playerTwo.syntaxForces - reward);
      playerOneLeagueProgress.syntaxForces += reward;
      playerTwoLeagueProgress.syntaxForces = Math.max(
        0,
        playerTwoLeagueProgress.syntaxForces - reward,
      );
      playerOne.battlesWon += 1;
    } else if (playerOnePoint < playerTwoPoint) {
      battle.winner = battle.playerTwo;
      const reward = battle.playerTwoReward?.syntaxForces || 0;

      playerTwo.syntaxForces += reward;
      playerOne.syntaxForces = Math.max(0, playerOne.syntaxForces - reward);
      playerTwoLeagueProgress.syntaxForces += reward;
      playerOneLeagueProgress.syntaxForces = Math.max(
        0,
        playerOneLeagueProgress.syntaxForces - reward,
      );
      playerTwo.battlesWon += 1;
    } else {
      battle.winner = null; // tie
    }
    battle.status = 'finished';

    // ⚡ SAVE EVERYTHING
    await battle.save();
    await playerOne.save();
    await playerTwo.save();
    await playerOneLeagueProgress.save();
    await playerTwoLeagueProgress.save();
  }
}

module.exports = {
  endBattles,
  startBattles,
};
