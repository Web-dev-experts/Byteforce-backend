require('./config/passport');
const express = require('express');
const cors = require('cors');
const errorHandling = require('./utils/errorHandling');
const userRoutes = require('./routes/userRoutes');
const entriesRoutes = require('./routes/entriesRoutes');
const leagueRoutes = require('./routes/leagueRoutes');
const pricingRoutes = require('./routes/pricingRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const passport = require('passport');
const { default: mongoose } = require('mongoose');
const { default: helmet } = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const { default: rateLimit } = require('express-rate-limit');
const app = express();

// ── Static files ──────────────────────────────────────────
app.use('/public', express.static('public'));

// ── Stripe webhook MUST be registered before express.json() ──
// Stripe requires the raw unparsed body to validate the webhook signature.
// If express.json() runs first, the body is already parsed and verification fails.
app.use('/api/v1/pricing/subscription', subscriptionRoutes);

// ── Body parsing ──────────────────────────────────────────
// Limit JSON body to 10kb to protect against payload-based DoS attacks.
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

// ── CORS ──────────────────────────────────────────────────
// Only allow requests from the local dev frontend and the production domain.
// credentials: true is required for cookies (JWT) to be sent cross-origin.
app.use(
  cors({
    origin: ['http://localhost:3000', 'https://byteforce.app'],
    credentials: true,
  }),
);

// ── General rate limiter ──────────────────────────────────
// 100 requests per 15 minutes per IP across all /api routes.
// Note: this also covers the Stripe webhook route — consider exempting it
// for high-volume production webhook traffic.
const limiter = rateLimit({
  max: 100,
  windowMs: 15 * 60 * 1000,
  message: 'Too many requests from this IP, try again later.',
});
app.use('/api', limiter);

// ── Auth-specific rate limiter ────────────────────────────
// Tighter limit (5 per 10 min) on login and signup to slow brute-force attempts.
const authLimiter = rateLimit({
  max: 5,
  windowMs: 10 * 60 * 1000,
});
app.use('/api/v1/auth/login', authLimiter);
app.use('/api/v1/auth/signup', authLimiter);

// ── Security middleware ───────────────────────────────────
// strictQuery: true silences Mongoose deprecation warnings for unknown query fields.
mongoose.set('strictQuery', true);

// helmet sets secure HTTP headers (X-Frame-Options, X-XSS-Protection, etc.)
// contentSecurityPolicy disabled because it often breaks APIs that return JSON.
app.use(helmet({ contentSecurityPolicy: false }));

// hpp prevents HTTP Parameter Pollution (e.g. ?sort=name&sort=XP flooding).
app.use(hpp());

// ── Passport ──────────────────────────────────────────────
// Required for OAuth strategies (Google, GitHub).
// passport.initialize() must come after body-parsing middleware.
// Session is not used — auth is stateless JWT.
app.use(passport.initialize());

// ── API Routes ────────────────────────────────────────────
app.use('/api/v1/auth', userRoutes);
app.use('/api/v1/entries', entriesRoutes);
app.use('/api/v1/leagues', leagueRoutes);
app.use('/api/v1/pricing', pricingRoutes);

// ── 404 handler ───────────────────────────────────────────
// Catches any request that didn't match a defined route.
app.use(function (req, res) {
  res.status(404).json({
    status: 'fail',
    message: 'This route does not exist',
  });
});

// ── Global error handler ──────────────────────────────────
// Must have 4 parameters (err, req, res, next) — Express identifies it as an error handler by arity.
app.use(errorHandling);

module.exports = app;
