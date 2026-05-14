const mongoose = require('mongoose');

// ─── Connection State Tracking ─────────────────────────────────────────────
let isConnected = false;

// ─── Mongoose Global Settings ──────────────────────────────────────────────
mongoose.set('strictQuery', true);

// ─── Event Listeners ───────────────────────────────────────────────────────
mongoose.connection.on('connected', () => {
  isConnected = true;
  console.log('✅  MongoDB connected');
});

mongoose.connection.on('disconnected', () => {
  isConnected = false;
  console.warn('⚠️  MongoDB disconnected — attempting to reconnect…');
});

mongoose.connection.on('error', (err) => {
  console.error('❌  MongoDB connection error:', err.message);
});

// ─── Connect Function ──────────────────────────────────────────────────────
const connectDB = async () => {
  if (isConnected) {
    console.log('ℹ️  Reusing existing MongoDB connection');
    return;
  }

  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error(
      'MONGODB_URI is not defined. Please set it in your .env file.'
    );
  }

  const options = {
    // Retry writes on transient errors
    retryWrites: true,
    // How long to wait finding a server before erroring
    serverSelectionTimeoutMS: 10_000,   // 10 s
    // Keepalive ping — tells Atlas "still here" every 10s to prevent idle drops
    heartbeatFrequencyMS: 10_000,       // 10 s
    // Give sockets 90s before timing out (Atlas free tier drops ~60s idle)
    socketTimeoutMS: 90_000,
    // Connection pool — minPoolSize 0 means don't force idle connections open
    // (avoids Atlas killing forced-open connections and triggering reconnect loops)
    maxPoolSize: 10,
    minPoolSize: 0,
  };

  try {
    await mongoose.connect(uri, options);
    // "connected" event above will set isConnected = true
  } catch (err) {
    console.error('❌  Initial MongoDB connection failed:', err.message);
    // Retry after 5 seconds instead of crashing the process
    console.log('🔄  Retrying connection in 5 seconds…');
    setTimeout(connectDB, 5_000);
  }
};

// ─── Graceful Shutdown ─────────────────────────────────────────────────────
const closeDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
    console.log('🔌  MongoDB connection closed gracefully');
  }
};

process.on('SIGINT', async () => {
  await closeDB();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closeDB();
  process.exit(0);
});

module.exports = connectDB;
