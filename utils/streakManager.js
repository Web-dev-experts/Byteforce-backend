// utils/streakManager.js
const User = require('../model/User/userModel');
const Entry = require('../model/Entries/entryModel');
const Subscription = require('../model/pricing/pricingModel');

const resetStreaks = async () => {
  try {
    const users = await User.find({});

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();

    for (const user of users) {
      // get last finished entry
      const lastEntry = await Entry.findOne({
        user: user._id,
        status: 'finished',
      }).sort({ createdAt: -1 });

      if (!lastEntry) {
        // no entries at all → reset streak
        const subscription = await Subscription.findById(user.subscription);
        if (subscription.streakFreeze === 0) {
          if (user.streak !== 0) {
            user.streak = 0;
            await user.save({ validateBeforeSave: false });
          }
        }
        continue;
      } else {
        user.streak += 1;
      }

      const lastEntryDay = lastEntry.startDate.toDateString();

      // if last entry was not yesterday, reset streak
      if (subscription.streakFreeze === 0) {
        if (lastEntryDay !== yesterdayStr) {
          user.streak = 0;
          await user.save({ validateBeforeSave: false });
        }
      }
    }

    console.log('Streaks checked and reset where needed');
  } catch (err) {
    console.error('Error resetting streaks:', err);
  }
};

module.exports = resetStreaks;
