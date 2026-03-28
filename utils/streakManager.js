const User = require('../model/User/userModel');
const Entry = require('../model/Entries/entryModel');
const Subscription = require('../model/pricing/pricingModel');

const resetStreaks = async () => {
  try {
    const users = await User.find();

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    // toDateString() returns "Mon Jan 01 2026" — timezone-aware comparison.
    // If the server is not in UTC, this may mismatch for users in other timezones.
    const yesterdayStr = yesterday.toDateString();

    for (const user of users) {
      const lastEntry = await Entry.findOne({
        user: user._id,
        status: 'finished',
      }).sort({ createdAt: -1 });

      const subscription = await Subscription.findById(user.subscription);
      if (!subscription) continue; // Changed to continue so it doesn't break the whole loop

      // ── SCENARIO A: User has NEVER made an entry ──
      if (!lastEntry) {
        if (user.streak > 0) {
          // Only penalize if they actually have a streak to lose
          if (user.streakFreezes > 0) {
            user.streakFreezes -= 1;
          } else {
            user.streak = 0;
          }
          await user.save({ validateBeforeSave: false });
        }
        continue;
      }

      const lastEntryDay = lastEntry.startDate.toDateString();

      // ── SCENARIO B: User missed yesterday ──
      if (lastEntryDay !== yesterdayStr) {
        if (user.streak > 0) {
          // Only penalize if they have a streak
          if (user.streakFreezes > 0) {
            user.streakFreezes -= 1; // Deduct a freeze!
          } else {
            user.streak = 0; // Out of freezes, reset streak!
          }
          await user.save({ validateBeforeSave: false });
        }
      }
    }

  } catch (err) {
    console.error('Error resetting streaks:', err);
  }
};

module.exports = resetStreaks;
