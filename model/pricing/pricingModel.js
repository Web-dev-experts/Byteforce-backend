const { Schema, model } = require('mongoose');

// Plan names must match what the frontend displays and what Stripe products are named.
// XPBonus is a multiplier applied to XP earned — confirm whether it's a flat
// addition or a direct multiplier in entryModel.finishEntry().

const pricingSchema = new Schema({
  name: {
    type: String,
    required: true,
    enum: ['free', 'Gold', 'PLUS', 'PRO', 'SUPER'],
  },
  price: {
    type: Number,
    required: true,
  },
  currency: {
    type: String,
    enum: [
      'USD',
      'EUR',
      'GBP',
      'JPY',
      'CNY',
      'AUD',
      'CAD',
      'CHF',
      'HKD',
      'SGD',
      'DZD',
    ],
    required: true,
  },
  interval: {
    type: String,
    required: true,
    enum: ['monthly', 'yearly', 'lifetime'],
  },
  maxProjects: {
    type: Number,
    required: true,
  },
  maxEntries: {
    type: Number,
    required: true,
  },
  XPBonus: {
    type: Number,
    required: true,
  },
  streakFreeze: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    default: 'active',
    enum: ['active', 'expired', 'canceled'],
  },
  // stripePriceId links this plan to a specific Stripe Price object.
  // This is used in createCheckoutSession to create the line item.
  stripePriceId: {
    type: String,
    required: true,
  },
});

// Automatically computes endDate when a new plan document is created.
// Only runs on isNew — plan documents are templates and should not
// recalculate on every save.

const Subscription = model('Subscription', pricingSchema);

module.exports = Subscription;
