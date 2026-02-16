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

module.exports = router;
