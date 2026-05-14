const express = require('express');
const router = express.Router();
const Job = require('../../models/Job');

const ok = (res, data, statusCode = 200) =>
  res.status(statusCode).json({ success: true, data });

const fail = (res, message, statusCode = 400) =>
  res.status(statusCode).json({ success: false, error: message });

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

router.post('/', async (req, res) => {
  try {
    const { company, role, status, source, appliedAt, notes } = req.body;

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

    return ok(res, job, 201);
  } catch (err) {
    console.error('POST /jobs error:', err.message);
    return fail(res, err.message, 400);
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const { _id, userId, createdAt, updatedAt, __v, ...updates } = req.body;

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
