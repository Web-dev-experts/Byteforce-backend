const express = require('express');
const authController = require('../controller/Authentication/authController');
const leagueController = require('../controller/Leagues/leagueController');
const router = express.Router();

// CREATE & END AN ENTRY
router
  .route('/leaderboard/:leagueName')
  .get(
    authController.protect,
    authController.protectVerified,
    leagueController.getLeaderboard,
  );
router
  .route('/archive/:seasonName')
  .get(
    authController.protect,
    authController.protectVerified,
    leagueController.getArchiveSeason,
  );
router
  .route('/archiveLeaderboard/:seasonName')
  .get(
    authController.protect,
    authController.protectVerified,
    leagueController.getArchiveLeaderboard,
  );
router
  .route('/allLeagues')
  .get(
    authController.protect,
    authController.protectVerified,
    leagueController.getAllLeagues,
  );
router
  .route('/allCurrentSeasons')
  .get(
    authController.protect,
    authController.protectVerified,
    leagueController.getAllCurrentSeason,
  );
router
  .route('/myCurrentSeason')
  .get(
    authController.protect,
    authController.protectVerified,
    leagueController.getMyCurrentSeason,
  );
router
  .route('/myProgress')
  .get(
    authController.protect,
    authController.protectVerified,
    leagueController.getUserProgress,
  );
router
  .route('/myStats')
  .get(
    authController.protect,
    authController.protectVerified,
    leagueController.getUserStats,
  );
router
  .route('/:leagueId')
  .get(
    authController.protect,
    authController.protectVerified,
    leagueController.getLeagueById,
  );

router
  .route('/declareWar/:userId')
  .get(
    authController.protect,
    authController.protectVerified,
    leagueController.declareWar,
  );
router
  .route('/warRequest/decision/:decision')
  .get(
    authController.protect,
    authController.protectVerified,
    leagueController.warDecision,
  );

module.exports = router;
