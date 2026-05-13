const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// ─── Helpers ──────────────────────────────────────────────────────────────────
const ok   = (res, data, code = 200) => res.status(code).json({ success: true, data });
const fail = (res, message, code = 400) => res.status(code).json({ success: false, error: message });

// ─── POST /api/auth/register ───────────────────────────────────────────────
/**
 * @route   POST /api/auth/register
 * @desc    Create a new account; returns JWT + user object
 * @body    { email, password }
 * @access  Public
 */
router.post('/register', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) return fail(res, 'email and password are required', 422);

  try {
    // Reject duplicates
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return fail(res, 'An account with that email already exists', 409);

    const user = await new User({ email, password }).save();

    const token = jwt.sign(
      { id: user._id.toString(), email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    return ok(res, {
      token,
      user: { id: user._id, email: user.email, createdAt: user.createdAt },
    }, 201);
  } catch (err) {
    console.error('POST /auth/register error:', err.message, err.stack);
    // Surface Mongoose validation errors cleanly
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message).join('; ');
      return fail(res, messages, 422);
    }
    if (err.name === 'MongoNetworkError' || err.name === 'MongooseServerSelectionError' || err.message?.includes('ECONNREFUSED') || err.message?.includes('connect')) {
      return fail(res, 'Cannot reach database — please try again shortly', 503);
    }
    return fail(res, 'Registration failed', 500);
  }
});

// ─── POST /api/auth/login ──────────────────────────────────────────────────
/**
 * @route   POST /api/auth/login
 * @desc    Verify credentials; returns JWT + user object
 * @body    { email, password }
 * @access  Public
 */
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) return fail(res, 'email and password are required', 422);

  try {
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) return fail(res, 'Invalid email or password', 401);

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return fail(res, 'Invalid email or password', 401);

    const token = jwt.sign(
      { id: user._id.toString(), email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    return ok(res, {
      token,
      user: { id: user._id, email: user.email, createdAt: user.createdAt },
    });
  } catch (err) {
    console.error('POST /auth/login error:', err.message, err.stack);
    // Surface a more useful message based on the type of failure
    if (err.name === 'MongoNetworkError' || err.name === 'MongooseServerSelectionError' || err.message?.includes('ECONNREFUSED') || err.message?.includes('connect')) {
      return fail(res, 'Cannot reach database — please try again shortly', 503);
    }
    return fail(res, 'An unexpected error occurred during login', 500);
  }
});

module.exports = router;
