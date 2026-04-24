const cron = require('node-cron');
const Job = require('../../models/Job');

/**
 * Initializes the daily reminder cron job.
 *
 * Schedule: 09:00 every day  →  '0 9 * * *'
 *
 * Query criteria:
 *   - status is 'applied' OR 'screening'
 *   - lastActivityAt is more than 7 days ago
 *   - snoozedUntil is null  OR  snoozedUntil is in the past
 *
 * NOTE: The broken dual-$or pattern from the previous version has been
 * fixed by combining both conditions under a single $and.
 */
const initReminderCron = () => {
  cron.schedule('0 9 * * *', async () => {
    console.log('\n⏰  [ReminderCron] Daily stale-job scan started —', new Date().toISOString());

    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const now = new Date();

      const staleJobs = await Job.find({
        // 1. Only track open statuses
        status: { $in: ['applied', 'screening'] },

        // 2. Must be inactive for 7+ days
        $or: [
          { lastActivityAt: { $lt: sevenDaysAgo } },
          { lastActivityAt: { $exists: false } },   // legacy data safety-net
        ],

        // 3. Not currently snoozed
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

      // ── Future: trigger email send here ────────────────────────────────
      // const { followUpTemplate } = require('../utils/emailTemplates');
      // staleJobs.forEach(job => sendEmail({ body: followUpTemplate(job) }));

      console.log('');  // blank line separator
    } catch (err) {
      console.error('❌  [ReminderCron] Error during scan:', err.message);
    }
  });

  console.log('📅  Reminder cron scheduled — runs daily at 09:00');
};

module.exports = initReminderCron;
