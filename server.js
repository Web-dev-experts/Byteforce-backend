require('dotenv').config({ path: './config.env' });
const runCron = require('./cron/seasonCron.js');
const app = require('./app.js');
const { default: mongoose } = require('mongoose');
const runStreakCron = require('./cron/streakCron.js');
const createLeaguesOnce = require('createLeagues.js');

const PORT = process.env.PORT || 3000;
const DB_LINK = process.env.DATABASE;

// CONNECTION TO DB
async function connectDB() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(DB_LINK);
    console.log('Connected to database successfully!');
    createLeaguesOnce();
    runCron();
    runStreakCron();
  } catch (err) {
    console.error(err.message);
    console.log('Failed to connect!');
  }
}

connectDB();

// SERVER LISTEN
app.listen(PORT, 'localhost', () => {
  console.log(`Server listening on ${PORT}`);
});
