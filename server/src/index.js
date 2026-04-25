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
const defaultOrigins = [
  'http://localhost:5173',
  'https://carrer-os-delta.vercel.app',
  'https://carrer-os-delta.vercel.app/'
];

const envOrigins = (process.env.CLIENT_URL || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

const allowedOrigins = [...new Set([...defaultOrigins, ...envOrigins])];

app.use(cors({
  origin: (origin, callback) => {
    // Allow curl / Postman / server-to-server requests (no Origin header)
    if (!origin) return callback(null, true);
    
    // In production, check against allowedOrigins. In dev, allow all.
    if (allowedOrigins.includes(origin) || !isProduction) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Blocked origin: ${origin}`);
      // Don't pass an error to callback, just return false to let the middleware handle it
      // This often results in a cleaner 403 response with headers
      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'x-migration-key'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  optionsSuccessStatus: 200
}));

// ─── Preflight OPTIONS Handler ─────────────────────────────────────────────
// Explicitly respond to all OPTIONS preflight requests before any other middleware.
// This is required for POST, PUT, DELETE requests from browsers to pass CORS checks.
app.options('*', cors());

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
app.use((err, req, res, _next) => {
  const statusCode = err.status || 500;
  
  if (!isProduction) {
    console.error('Unhandled server error:', err);
  }

  // CRITICAL: Ensure CORS headers are present even on error responses
  // Otherwise the browser will hide the real error behind a "CORS blocked" message
  const origin = req.headers.origin;
  if (origin && (allowedOrigins.includes(origin) || !isProduction)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With,Accept');
  }

  res.status(statusCode).json({
    success: false,
    error: err.message || 'Internal server error',
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
