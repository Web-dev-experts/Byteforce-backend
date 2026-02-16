const express = require('express');
const authController = require('../controller/Authentication/authController');
const entryController = require('../controller/Entries/entryController');
const projectController = require('../controller/Entries/projectController');
const pricingController = require('../controller/pricing/pricingController');
const subscriptionController = require('../controller/pricing/subscriptionController');
const router = express.Router();

router
  .route('/createPricing')
  .post(
    authController.protect,
    authController.protectVerified,
    authController.restrictTo('admin'),
    pricingController.createSubscription,
  );
router
  .route('/getAllPricings')
  .get(
    authController.protect,
    authController.protectVerified,
    pricingController.getAllPricing,
  );
router
  .route('/getPricing/:pricingId')
  .get(
    authController.protect,
    authController.protectVerified,
    pricingController.getPricing,
  );
router
  .route('/deletePricing/:pricingId')
  .delete(
    authController.protect,
    authController.protectVerified,
    authController.restrictTo('admin'),
    pricingController.deleteSubscription,
  );
router
  .route('/editPricing/:pricingId')
  .patch(
    authController.protect,
    authController.protectVerified,
    authController.restrictTo('admin'),
    pricingController.updateSubscription,
  );

module.exports = router;
