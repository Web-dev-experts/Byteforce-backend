const { Schema, model } = require('mongoose');
const { validate } = require('node-cron');
const { isCurrency } = require('validator');

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
  startDate: {
    type: Date,
    default: Date.now,
  },
  endDate: {
    type: Date,
  },
  stripePriceId: {
    type: String,
    required: true,
  },
});

pricingSchema.pre('save', function () {
  if (!this.isNew) return;

  if (this.interval === 'monthly') {
    const start = new Date(this.startDate);
    this.endDate = start.setMonth(start.getMonth() + 1);
  }
  if (this.interval === 'yearly') {
    const nextYear = new Date(this.startDate);
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    this.endDate = nextYear;
  }
  if (this.interval === 'lifetime') this.endDate = undefined;
});

const Subscription = model('Subscription', pricingSchema);

module.exports = Subscription;
