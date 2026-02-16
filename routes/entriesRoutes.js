const express = require('express');
const authController = require('../controller/Authentication/authController');
const entryController = require('../controller/Entries/entryController');
const projectController = require('../controller/Entries/projectController');
const router = express.Router();

// CREATE & END AN ENTRY
router
  .route('/start')
  .post(
    authController.protect,
    authController.protectVerified,
    entryController.startEntry,
  );
router
  .route('/end')
  .post(
    authController.protect,
    authController.protectVerified,
    entryController.endEntry,
  );

// EDIT & DELETE ENTRIES
router
  .route('/edit/:entryId')
  .patch(
    authController.protect,
    authController.protectVerified,
    entryController.editEntry,
  );
router
  .route('/delete/:entryId')
  .delete(
    authController.protect,
    authController.protectVerified,
    entryController.deleteEntry,
  );

// GET ENTRIES
router
  .route('/getMyEntry/:entryId')
  .get(
    authController.protect,
    authController.protectVerified,
    entryController.getMyEntry,
  );
router
  .route('/getAllEntries')
  .get(
    authController.protect,
    authController.protectVerified,
    entryController.getAllMyEntries,
  );

// PROJECTS
router
  .route('/createProject')
  .post(
    authController.protect,
    authController.protectVerified,
    projectController.createProject,
  );
router
  .route('/finishProject/:projectId')
  .get(
    authController.protect,
    authController.protectVerified,
    projectController.finishProject,
  );
router
  .route('/getProject/:projectId')
  .get(
    authController.protect,
    authController.protectVerified,
    projectController.getProject,
  );
router
  .route('/deleteProject/:projectId')
  .delete(
    authController.protect,
    authController.protectVerified,
    projectController.deleteProject,
  );
router
  .route('/editProject/:projectId')
  .patch(
    authController.protect,
    authController.protectVerified,
    projectController.editProject,
  );

module.exports = router;
