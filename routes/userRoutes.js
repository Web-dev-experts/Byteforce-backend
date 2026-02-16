const express = require('express');
const authController = require('../controller/Authentication/authController');
const userController = require('../controller/Authentication/userController');
const passport = require('passport');
const upload = require('../utils/upload');

const router = express.Router();

// SIGN UP & CREATE AN ACCOUNT
router.route('/signup').post(authController.signup);
router.route('/verifyAccount').post(authController.verifyAccount);

// LOG IN OR OUT
router.route('/login').post(authController.login);
router.route('/logout').get(authController.protect, authController.logout);

// PASSWORD RESET
router.route('/forgotPassword').post(authController.forgotPassword);
router.route('/reset-code-check').post(authController.resetCodeCheck);
router
  .route('/resetPassword')
  .patch(authController.protectReset, authController.resetPassword);

router // Google OAuth
  .get('/google', authController.googleAuth);

router.get(
  '/google/callback',
  passport.authenticate('google', { session: false }),
  authController.googleCallback,
);

// Github OAuth

router.get('/github', authController.githubAuth);

router.get(
  '/github/callback',
  passport.authenticate('github', { session: false }),
  authController.githubCallback,
);

// ME OPERATIONS
// GET
router
  .route('/me')
  .get(
    authController.protect,
    authController.protectVerified,
    userController.getMe,
  );
// UPDATE
router
  .route('/updateMe')
  .patch(
    authController.protect,
    authController.protectVerified,
    userController.updateMe,
  );
router
  .route('/updateMe/photo')
  .patch(
    authController.protect,
    authController.protectVerified,
    upload.single('photo'),
    userController.updatePhoto,
  );
// DELETE
router
  .route('/deleteMe')
  .delete(
    authController.protect,
    authController.protectVerified,
    userController.deleteMe,
  );
// DEACTIVATE
router
  .route('/deactivateMe')
  .patch(
    authController.protect,
    authController.protectVerified,
    userController.deactivateMe,
  );

module.exports = router;
