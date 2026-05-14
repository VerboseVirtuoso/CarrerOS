require('dns').setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const connectDB  = require('../config/db');
const initReminderCron = require('./jobs/reminderCron');
const verifyToken      = require('./middleware/auth');

const app  = express();
const PORT = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === 'production';

connectDB();

const corsOptions = {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-migration-key'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/test', (_req, res) => res.send('deploy working'));

app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV || 'development',
    },
  });
});

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
        details: result,
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
}

app.use('/api/auth', require('./routes/auth'));

app.use('/api/jobs',      verifyToken, require('./routes/jobs'));
app.use('/api/reminders', verifyToken, require('./routes/reminders'));

app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

app.use((err, _req, res, _next) => {
  const statusCode = err.status || 500;

  if (!isProduction) {
    console.error('Unhandled server error:', err);
  }

  res.status(statusCode).json({
    success: false,
    error: err.message || 'Internal server error',
    stack: isProduction ? undefined : err.stack,
  });
});

app.listen(PORT, () => {
  console.log(`🚀  Server running → http://localhost:${PORT}`);
  console.log(`🌍  Environment: ${process.env.NODE_ENV || 'development'}`);
  initReminderCron();
});

module.exports = app;
