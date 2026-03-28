const User = require('../../model/User/userModel');
const stripe = require('../../config/stripe');
const Subscription = require('../../model/pricing/pricingModel');
const catchAsync = require('../../utils/catchAsync');
const AppError = require('../../utils/AppError');

// ── activateSubscription (internal helper) ────────────────
// Called after a successful Stripe checkout.
// Looks up the Subscription plan by Stripe price ID and links it to the user.
const activateSubscription = async (userId, planName, session) => {
  const user = await User.findById(userId);
  if (!user) return;

  const subscription = await stripe.subscriptions.retrieve(
    session.subscription,
  );
  const sub = await Subscription.findOne({
    stripePriceId: subscription.plan.id,
  });
  if (!sub) return;
  user.subscription = sub._id;
  user.subscriptionStatus = subscription.status;
  user.stripeCustomerId = session.customer;
  user.stripeSubscriptionId = subscription.id;
  user.subscriptionStart = new Date(subscription.start_date * 1000);
  user.streakFreezes = sub.streakFreeze;

  // Calculate subscription end date based on interval.
  // setMonth/setFullYear mutate the Date in place and return a timestamp —
  // the fixed version correctly uses the mutated Date object (not the return value).
  if (sub.interval === 'monthly') {
    const start = new Date(user.subscriptionStart);
    start.setMonth(start.getMonth() + 1);
    user.subscriptionEnd = start;
  }
  if (sub.interval === 'yearly') {
    const nextYear = new Date(user.subscriptionStart);
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    user.subscriptionEnd = nextYear;
  }
  // Lifetime plans have no end date.
  if (sub.interval === 'lifetime') user.subscriptionEnd = undefined;

  await user.save();
};

// ── Create Checkout Session ───────────────────────────────
// Creates a Stripe Checkout session for the requested plan.
// Lifetime plans use 'payment' mode; recurring plans use 'subscription' mode.
// The frontend redirects the user to session.url.
exports.createCheckoutSession = catchAsync(async (req, res, next) => {
  const { planId } = req.body;

  const pricing = await Subscription.findById(planId);
  if (!pricing) return next(new AppError('Plan not found', 404));

  const session = await stripe.checkout.sessions.create({
    mode: pricing.interval === 'lifetime' ? 'payment' : 'subscription',
    payment_method_types: ['card'],
    customer_email: req.user.email,
    line_items: [
      {
        price: pricing.stripePriceId,
        quantity: 1,
      },
    ],
    // userId and planName are passed as metadata so the webhook can
    // identify which user and plan to activate without a DB lookup on email.
    metadata: {
      userId: req.user.id,
      planName: pricing.name,
    },
    success_url: `${process.env.FRONTEND_URL}/success`,
    cancel_url: `${process.env.FRONTEND_URL}/cancel`,
  });

  res.status(200).json({
    status: 'success',
    url: session.url,
  });
});

// ── Stripe Webhook ────────────────────────────────────────
// Receives and verifies Stripe event notifications.
// Must use raw body — express.json() must NOT have run on this route
// (handled correctly in subscriptionRoutes.js).
// Handles: checkout.session.completed, invoice.payment_failed,
//          customer.subscription.deleted.
exports.stripeWebhookController = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    // Stripe verifies the webhook signature using the raw body and the secret.
    // If constructEvent throws, the request is rejected with 400.
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    console.log('Webhook error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // ✅ Checkout completed
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    const userId = session.metadata.userId;
    const planName = session.metadata.planName;

    try {
      await activateSubscription(userId, planName, session);
    } catch (err) {
      console.error(err.message);
    }
  }

  // ✅ Payment failed — mark user as past_due but don't cancel immediately.
  if (event.type === 'invoice.payment_failed') {
    const subscription = event.data.object;

    const user = await User.findOne({
      stripeSubscriptionId: subscription.subscription,
    });

    if (user) {
      user.subscriptionStatus = 'past_due';
      await user.save();
    }
  }

  // ✅ Subscription canceled — reset user to free tier.
  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object;

    const user = await User.findOne({
      stripeSubscriptionId: subscription.id,
    });

    if (user) {
      user.subscription = process.env.DEFAULT_SUBSCRIPTION_ID;
      user.subscriptionStatus = 'canceled';
      user.stripeSubscriptionId = null;
      user.subscriptionStart = null;
      user.subscriptionEnd = null;
      user.streakFreezes = 0;

      await user.save();
    }
  }

  // Always respond 200 to Stripe so it doesn't retry the event.
  res.status(200).json({ received: true });
};

// ── Cancel subscription ───────────────────────────────────
// Cancels the Stripe subscription immediately.
// Stripe will then send a 'customer.subscription.deleted' webhook
// which handles the actual DB update via the webhook handler above.
exports.cancelSubscription = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id);

  if (!user.stripeSubscriptionId)
    return next(new AppError('No active subscription', 400));

  // stripe.subscriptions.cancel() is the correct SDK v8+ method.
  await stripe.subscriptions.cancel(user.stripeSubscriptionId);

  res.status(200).json({
    status: 'success',
    message: 'Subscription canceled successfully',
  });
});
