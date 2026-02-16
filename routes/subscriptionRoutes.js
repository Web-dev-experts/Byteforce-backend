const express = require('express');
const authController = require('../controller/Authentication/authController');
const subscriptionController = require('../controller/pricing/subscriptionController');
const router = express.Router();

// STRIPE WEBHOOK — must use raw body
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  subscriptionController.stripeWebhookController,
);

// Other subscription routes can use express.json()
router.use(express.json());
router.post(
  '/checkout',
  authController.protect,
  authController.protectVerified,
  subscriptionController.createCheckoutSession,
);
router.post(
  '/cancel',
  authController.protect,
  authController.protectVerified,
  subscriptionController.cancelSubscription,
);

module.exports = router;
