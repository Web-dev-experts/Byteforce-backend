require('dotenv').config({ path: './config.env' });
const runCron = require('./cron/seasonCron.js');
const app = require('./app.js');
const { default: mongoose } = require('mongoose');
const runStreakCron = require('./cron/streakCron.js');
const createLeaguesOnce = require('./config/createLeagues.js');

const PORT = process.env.PORT || 3000;
const DB_LINK = process.env.DATABASE;
const DB_LINK_LOCAL = process.env.DATABASELOCAL;

// ── Database connection ───────────────────────────────────
// All startup tasks (league seeding, cron jobs) are gated behind
// a successful DB connection so they never run against nothing.
async function connectDB() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(DB_LINK);
    console.log('Connected to database successfully!');

    // Seed the 20 leagues once — skips if they already exist.
    await createLeaguesOnce();

    // Start the daily season management cron (midnight).
    runCron();

    // Start the daily streak reset cron (midnight).
    runStreakCron();
  } catch (err) {
    console.error(err);
    console.log('Failed to connect!');
    process.exit(1);
  }
}

connectDB();

// ── HTTP server ───────────────────────────────────────────
// Starts before connectDB resolves — requests arriving before the DB
// is ready will fail. This is acceptable for development but worth
// noting for production cold-starts.
app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});
