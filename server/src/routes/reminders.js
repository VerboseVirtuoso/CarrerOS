const express = require('express');
const router = express.Router();
const Job = require('../../models/Job');

const ok   = (res, data, code = 200) => res.status(code).json({ success: true, data });
const fail = (res, message, code = 400) => res.status(code).json({ success: false, error: message });

router.get('/', async (req, res) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const now = new Date();

    const staleJobs = await Job.find({
      userId: req.userId,
      status: { $in: ['applied', 'screening'] },
      $or: [
        { lastActivityAt: { $lt: sevenDaysAgo } },
        { lastActivityAt: { $exists: false } },
      ],
    }).sort({ lastActivityAt: 1 });

    const activeReminders  = [];
    const snoozedReminders = [];

    staleJobs.forEach(job => {
      const obj = job.toObject({ virtuals: true });

      const base = job.lastActivityAt || job.appliedAt;
      obj.daysSinceActivity = base
        ? Math.floor((now - new Date(base)) / 86_400_000)
        : null;

      if (job.snoozedUntil && new Date(job.snoozedUntil) > now) {
        obj.snoozeExpiresIn = Math.ceil(
          (new Date(job.snoozedUntil) - now) / 86_400_000
        );
        snoozedReminders.push(obj);
      } else {
        activeReminders.push(obj);
      }
    });

    return ok(res, {
      activeReminders,
      snoozedReminders,
      totalStale: activeReminders.length,
    });
  } catch (err) {
    console.error('GET /reminders error:', err.message);
    return fail(res, 'Failed to fetch reminders', 500);
  }
});

module.exports = router;
