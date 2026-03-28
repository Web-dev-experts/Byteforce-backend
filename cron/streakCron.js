const nodeCron = require('node-cron');
const resetStreaks = require('../utils/streakManager');

function runStreakCron() {
  nodeCron.schedule('0 0 * * *', async () => {
    console.log('Running daily streak reset...');
    // Errors inside it are caught internally in streakManager.js.
    await resetStreaks();
  });
}

module.exports = runStreakCron;
