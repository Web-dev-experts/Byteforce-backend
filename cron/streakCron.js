const nodeCron = require('node-cron');
const resetStreaks = require('../utils/streakManager');

// Run every day at midnight
function runStreakCron() {
  nodeCron.schedule('0 0 * * *', () => {
    console.log('Running daily streak reset...');
    resetStreaks();
  });
}

module.exports = runStreakCron;
