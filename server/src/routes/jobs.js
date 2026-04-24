const express = require('express');
const router = express.Router();
const Job = require('../../models/Job');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Send a consistent success envelope */
const ok = (res, data, statusCode = 200) =>
  res.status(statusCode).json({ success: true, data });

/** Send a consistent error envelope */
const fail = (res, message, statusCode = 400) =>
  res.status(statusCode).json({ success: false, error: message });

// ─── GET /api/jobs ─────────────────────────────────────────────────────────
/**
 * @route   GET /api/jobs
 * @desc    Return all jobs for the current user, sorted by appliedAt desc
 * @access  Protected
 */
router.get('/', async (req, res) => {
  try {
    const jobs = await Job
      .find({ userId: req.userId })
      .sort({ appliedAt: -1 });
    return ok(res, jobs);
  } catch (err) {
    console.error('GET /jobs error:', err.message);
    return fail(res, err.message, 500);
  }
});

// ─── GET /api/jobs/:id ─────────────────────────────────────────────────────
/**
 * @route   GET /api/jobs/:id
 * @desc    Return a single job with all fields (scoped to owner)
 * @access  Protected
 */
router.get('/:id', async (req, res) => {
  try {
    const job = await Job.findOne({ _id: req.params.id, userId: req.userId });
    if (!job) return fail(res, 'Job not found', 404);
    return ok(res, job);
  } catch (err) {
    console.error('GET /jobs/:id error:', err.message);
    return fail(res, err.message, 500);
  }
});

// ─── POST /api/jobs ────────────────────────────────────────────────────────
/**
 * @route   POST /api/jobs
 * @desc    Create a new job application
 * @body    { company, role, status?, source? }
 * @access  Protected
 */
router.post('/', async (req, res) => {
  try {
    const { company, role, status, source, appliedAt, notes } = req.body;

    // Debug logging
    console.log('[DEBUG] POST /jobs call received:');
    console.log(' - UserID:', req.userId);
    console.log(' - Body:', JSON.stringify(req.body, null, 2));

    if (!req.userId || req.userId === 'dev-user-001') {
      console.warn('⚠️ WARNING: saving job with fallback or missing userId ("dev-user-001")');
    }

    if (!company || !role) {
      return fail(res, 'company and role are required', 422);
    }

    const job = await new Job({
      company,
      role,
      status:    status    || 'applied',
      source:    source    || 'other',
      appliedAt: appliedAt || new Date(),
      notes:     notes ? [{ text: notes }] : [],
      userId:    req.userId,
    }).save();

    console.log('[DEBUG] Job saved successfully. ID:', job._id);

    return ok(res, job, 201);
  } catch (err) {
    console.error('POST /jobs error:', err.message);
    return fail(res, err.message, 400);
  }
});

// ─── PATCH /api/jobs/:id ───────────────────────────────────────────────────
/**
 * @route   PATCH /api/jobs/:id
 * @desc    Update any field on a job (drag-drop status change, general edits)
 *          Automatically sets lastActivityAt = now when status changes.
 * @access  Protected
 */
router.patch('/:id', async (req, res) => {
  try {
    // Strip fields the client must never override directly
    const { _id, userId, createdAt, updatedAt, __v, ...updates } = req.body;

    // If status is being updated, refresh lastActivityAt
    if (updates.status) {
      updates.lastActivityAt = new Date();
    }

    const job = await Job.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!job) return fail(res, 'Job not found', 404);
    return ok(res, job);
  } catch (err) {
    console.error('PATCH /jobs/:id error:', err.message);
    return fail(res, err.message, 400);
  }
});

// ─── DELETE /api/jobs/:id ──────────────────────────────────────────────────
/**
 * @route   DELETE /api/jobs/:id
 * @desc    Permanently delete a job application (scoped to owner)
 * @access  Protected
 */
router.delete('/:id', async (req, res) => {
  try {
    const job = await Job.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId,
    });
    if (!job) return fail(res, 'Job not found', 404);
    return ok(res, { deleted: true, id: req.params.id });
  } catch (err) {
    console.error('DELETE /jobs/:id error:', err.message);
    return fail(res, err.message, 500);
  }
});

// ─── PATCH /api/jobs/:id/status ────────────────────────────────────────────
/**
 * @route   PATCH /api/jobs/:id/status
 * @desc    Update job status and stamp lastActivityAt = now
 * @body    { status: 'screening' | 'interview' | ... }
 * @access  Protected
 */
router.patch('/:id/status', async (req, res) => {
  const { status } = req.body;

  if (!status) return fail(res, 'status is required', 422);

  try {
    const job = await Job.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { status, lastActivityAt: new Date() },
      { new: true, runValidators: true }
    );
    if (!job) return fail(res, 'Job not found', 404);
    return ok(res, job);
  } catch (err) {
    console.error('PATCH /jobs/:id/status error:', err.message);
    return fail(res, err.message, 400);
  }
});

// ─── PATCH /api/jobs/:id/snooze ────────────────────────────────────────────
/**
 * @route   PATCH /api/jobs/:id/snooze
 * @desc    Snooze a job reminder for N days from now
 * @body    { days: 3 }
 * @access  Protected
 */
router.patch('/:id/snooze', async (req, res) => {
  const days = Number(req.body.days) || 3;

  const snoozedUntil = new Date();
  snoozedUntil.setDate(snoozedUntil.getDate() + days);

  try {
    const job = await Job.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { snoozedUntil },
      { new: true }
    );
    if (!job) return fail(res, 'Job not found', 404);
    return ok(res, job);
  } catch (err) {
    console.error('PATCH /jobs/:id/snooze error:', err.message);
    return fail(res, err.message, 400);
  }
});

// ─── PATCH /api/jobs/:id/unsnooze ─────────────────────────────────────────
/**
 * @route   PATCH /api/jobs/:id/unsnooze
 * @desc    Clear the snooze on a job
 * @access  Protected
 */
router.patch('/:id/unsnooze', async (req, res) => {
  try {
    const job = await Job.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { snoozedUntil: null },
      { new: true }
    );
    if (!job) return fail(res, 'Job not found', 404);
    return ok(res, job);
  } catch (err) {
    console.error('PATCH /jobs/:id/unsnooze error:', err.message);
    return fail(res, err.message, 400);
  }
});

// ─── PATCH /api/jobs/:id/score ─────────────────────────────────────────────
/**
 * @route   PATCH /api/jobs/:id/score
 * @desc    Save the resume match score for a job
 * @body    { score: 72 }
 * @access  Protected
 */
router.patch('/:id/score', async (req, res) => {
  const score = Number(req.body.score);

  if (isNaN(score) || score < 0 || score > 100) {
    return fail(res, 'score must be a number between 0 and 100', 422);
  }

  try {
    const job = await Job.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { resumeMatchScore: score },
      { new: true, runValidators: true }
    );
    if (!job) return fail(res, 'Job not found', 404);
    return ok(res, job);
  } catch (err) {
    console.error('PATCH /jobs/:id/score error:', err.message);
    return fail(res, err.message, 400);
  }
});

module.exports = router;
