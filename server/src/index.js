require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const connectDB  = require('../config/db');
const initReminderCron = require('./jobs/reminderCron');
const verifyToken      = require('./middleware/auth');

const app  = express();
const PORT = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === 'production';

// ─── Database ──────────────────────────────────────────────────────────────
connectDB();

// ─── CORS ─────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    // Allow curl / Postman / server-to-server requests (no Origin header)
    if (!origin) return callback(null, true);
    
    // In production, strictly enforce allowedOrigins
    if (isProduction) {
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`CORS blocked: Origin ${origin} is not authorized`));
    }
    
    // In development, allow all origins
    return callback(null, true);
  },
  credentials: true,
}));

// ─── Body Parsing ──────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Health Check (public) ─────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ 
    success: true, 
    data: { 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV || 'development'
    } 
  });
});

// ─── Debug Endpoints (Dev Only) ───────────────────────────────────────────
if (!isProduction) {
  const Job = require('../models/Job');
  app.get('/api/debug/jobs', async (_req, res) => {
    try {
      const allJobs = await Job.find({}).sort({ createdAt: -1 }).limit(50);
      res.json({ success: true, count: allJobs.length, data: allJobs });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Data Migration: Update dev-user-001 jobs to a real userId
  app.patch('/api/debug/migrate-userid', async (req, res) => {
    const secretKey = req.headers['x-migration-key'];
    const { targetUserId } = req.body;

    if (!secretKey || secretKey !== process.env.MIGRATION_KEY) {
      return res.status(403).json({ success: false, error: 'Forbidden: Invalid migration key' });
    }

    if (!targetUserId) {
      return res.status(400).json({ success: false, error: 'targetUserId is required' });
    }

    try {
      const result = await Job.updateMany(
        { userId: 'dev-user-001' },
        { $set: { userId: targetUserId } }
      );
      res.json({ 
        success: true, 
        message: `Migrated ${result.modifiedCount} jobs to ${targetUserId}`,
        details: result 
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
}

// ─── Public Routes (no auth required) ─────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));

// ─── Protected Routes (JWT required) ──────────────────────────────────────
app.use('/api/jobs',      verifyToken, require('./routes/jobs'));
app.use('/api/reminders', verifyToken, require('./routes/reminders'));

// ─── 404 Handler ──────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// ─── Global Error Handler ──────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  const statusCode = err.status || 500;
  
  if (!isProduction) {
    console.error('Unhandled server error:', err);
  }

  res.status(statusCode).json({
    success: false,
    error: err.message || 'Internal server error',
    // Suppress stack trace in production for security
    stack: isProduction ? undefined : err.stack,
  });
});

// ─── Start ────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀  Server running → http://localhost:${PORT}`);
  console.log(`🌍  Environment: ${process.env.NODE_ENV || 'development'}`);
  initReminderCron();
});

module.exports = app;
