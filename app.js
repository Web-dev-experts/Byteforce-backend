const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const errorHandling = require('./utils/errorHandling');
const userRoutes = require('./routes/userRoutes');
const entriesRoutes = require('./routes/entriesRoutes');
const leagueRoutes = require('./routes/leagueRoutes');
const pricingRoutes = require('./routes/pricingRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const subscriptionController = require('./controller/pricing/subscriptionController');
const passport = require('passport');
const { default: mongoose } = require('mongoose');
const { default: helmet } = require('helmet');
const hpp = require('hpp');
const { default: rateLimit } = require('express-rate-limit');
const app = express();
// READ DATA FROM BODY TO req.body
app.use('/public', express.static('public'));
app.use('/api/v1/pricing/subscription', subscriptionRoutes);
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

// SECURITY
// CORS
app.use(
  cors({
    origin: ['http://localhost:3000', 'https://byteforce.app'],
    credentials: true,
  }),
);
// LIMITER
const limiter = rateLimit({
  max: 100,
  windowMs: 15 * 60 * 1000,
  message: 'Too many requests from this IP, try again later.',
});
app.use('/api', limiter);
// AUTH LIMITER
const authLimiter = rateLimit({
  max: 5,
  windowMs: 10 * 60 * 1000,
});
app.use('/api/v1/auth/login', authLimiter);
app.use('/api/v1/auth/signup', authLimiter);
// QUERY SANITIZATION
mongoose.set('strictQuery', true);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(hpp());

// ROUTES
app.use(passport.initialize());
app.use('/api/v1/auth', userRoutes);
app.use('/api/v1/entries', entriesRoutes);
app.use('/api/v1/leagues', leagueRoutes);
app.use('/api/v1/pricing', pricingRoutes);
app.use(function (req, res) {
  res.status(404).json({
    status: 'fail',
    message: 'This route does not exist',
  });
});
app.use(errorHandling);

module.exports = app;
