const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;

/* ================= GOOGLE ================= */
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      // callbackURL must match the authorized redirect URI in Google Cloud Console.
      callbackURL: '/api/v1/auth/google/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      // Pass profile data to the controller via done(null, user).
      // done(null, false) would reject the login; done(err) would pass an error.
      return done(null, {
        googleId: profile.id,
        email: profile.emails[0].value,
        name: profile.displayName,
        profilePicture: profile.photos[0].value,
      });
    },
  ),
);

/* ================= GITHUB ================= */
passport.use(
  'github-auth',
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: '/api/v1/auth/github/callback',
      // 'user:email' scope is required to access the user's email address.
      // Without it, profile.emails will be empty.
      scope: ['user:email'],
    },
    async (accessToken, refreshToken, profile, done) => {
      // GitHub may not return an email if none is set as public.
      // The null fallback is handled in githubCallback with an AppError.
      const email =
        profile.emails && profile.emails.length
          ? profile.emails[0].value
          : null;

      return done(null, {
        githubId: profile.id,
        email,
        name: profile.displayName || profile.username,
        profilePicture: profile.photos[0].value,
      });
    },
  ),
);

passport.use(
  'github-connect',
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: '/api/v1/auth/github/connect/callback',
      passReqToCallback: true,
    },
    async (req, accessToken, refreshToken, profile, done) => {
      return done(null, {
        githubAccessToken: accessToken,
        userId: req.user?._id,
      });
    },
  ),
);

module.exports = passport;
