const cron = require('node-cron');
const Job = require('../../models/Job');

const initReminderCron = () => {
  cron.schedule('0 9 * * *', async () => {
    console.log('\n⏰  [ReminderCron] Daily stale-job scan started —', new Date().toISOString());

    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const now = new Date();

      const staleJobs = await Job.find({
        status: { $in: ['applied', 'screening'] },
        $or: [
          { lastActivityAt: { $lt: sevenDaysAgo } },
          { lastActivityAt: { $exists: false } },
        ],
        $and: [
          {
            $or: [
              { snoozedUntil: null },
              { snoozedUntil: { $exists: false } },
              { snoozedUntil: { $lte: now } },
            ],
          },
        ],
      }).select('company role status lastActivityAt userId');

      if (staleJobs.length === 0) {
        console.log('✅  [ReminderCron] No stale jobs found today.\n');
        return;
      }

      console.log(`📡  [ReminderCron] Found ${staleJobs.length} stale job(s) needing follow-up:`);

      staleJobs.forEach(job => {
        const base = job.lastActivityAt || job.appliedAt;
        const daysSince = base
          ? Math.floor((now - new Date(base)) / 86_400_000)
          : '?';

        console.log(
          `   • [${job.status.toUpperCase()}] ${job.company} — ${job.role}` +
          ` (${daysSince} days since last activity | userId: ${job.userId})`
        );
      });

      console.log('');
    } catch (err) {
      console.error('❌  [ReminderCron] Error during scan:', err.message);
    }
  });

  console.log('📅  Reminder cron scheduled — runs daily at 09:00');
};

module.exports = initReminderCron;
