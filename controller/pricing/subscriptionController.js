const stripe = require('../../config/stripe');
const Subscription = require('../../model/pricing/pricingModel');
const User = require('../../model/User/userModel');
const catchAsync = require('../../utils/catchAsync');
const AppError = require('../../utils/AppError');

const activateSubscription = async (userId, planName, session) => {
  const user = await User.findById(userId);
  if (!user) return;

  const subscription = await stripe.subscriptions.retrieve(
    session.subscription,
  );
  const sub = await Subscription.findOne({
    stripePriceId: subscription.plan.id,
  });
  console.log(new Date(subscription.start_date * 1000), subscription);
  if (!sub) return;
  user.subscription = sub._id;
  user.subscriptionStatus = subscription.status;
  user.stripeCustomerId = session.customer;
  user.stripeSubscriptionId = subscription.id;
  user.subscriptionStart = new Date(subscription.start_date * 1000);
  if (sub.interval === 'monthly') {
    const start = new Date(user.subscriptionStart);
    user.subscriptionEnd = start.setMonth(start.getMonth() + 1);
  }
  if (sub.interval === 'yearly') {
    const nextYear = new Date(user.subscriptionStart);
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    user.subscriptionEnd = nextYear;
  }
  if (sub.interval === 'lifetime') sub.endDate = undefined;

  await user.save();
};

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

exports.stripeWebhookController = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
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

  // ✅ Payment failed
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

  // ✅ Subscription canceled
  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object;

    const user = await User.findOne({
      stripeSubscriptionId: subscription.id,
    });

    if (user) {
      user.plan = 'free';
      user.subscriptionStatus = 'canceled';
      user.stripeSubscriptionId = null;
      user.subscriptionStart = null;
      user.subscriptionEnd = null;

      await user.save();
    }
  }

  res.status(200).json({ received: true });
};

exports.cancelSubscription = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id);

  if (!user.stripeSubscriptionId)
    return next(new AppError('No active subscription', 400));

  await stripe.subscriptions.del(user.stripeSubscriptionId);

  res.status(200).json({
    status: 'success',
    message: 'Subscription canceled successfully',
  });
});
