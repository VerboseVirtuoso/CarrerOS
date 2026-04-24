const express = require('express');
const router = express.Router();
const Job = require('../../models/Job');

// ─── Helpers ──────────────────────────────────────────────────────────────────
const ok   = (res, data, code = 200) => res.status(code).json({ success: true, data });
const fail = (res, message, code = 400) => res.status(code).json({ success: false, error: message });

// ─── GET /api/reminders ────────────────────────────────────────────────────
/**
 * @route   GET /api/reminders
 * @desc    Return stale jobs (applied/screening, 7+ days inactive, not snoozed)
 *          Each job includes daysSinceActivity for the frontend to display.
 * @access  Protected
 */
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

      // daysSinceActivity mirrors the virtual daysInCurrentStatus but is
      // explicit for consumers who may not use virtuals
      const base = job.lastActivityAt || job.appliedAt;
      obj.daysSinceActivity = base
        ? Math.floor((now - new Date(base)) / 86_400_000)
        : null;

      if (job.snoozedUntil && new Date(job.snoozedUntil) > now) {
        // Also tell the frontend when the snooze expires
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
