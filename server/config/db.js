const mongoose = require('mongoose');

let isConnected = false;

mongoose.set('strictQuery', true);

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

const connectDB = async () => {
  if (isConnected) {
    console.log('ℹ️  Reusing existing MongoDB connection');
    return;
  }

  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error('MONGODB_URI is not defined. Please set it in your .env file.');
  }

  const options = {
    retryWrites: true,
    serverSelectionTimeoutMS: 10_000,
    heartbeatFrequencyMS: 10_000,
    socketTimeoutMS: 90_000,
    maxPoolSize: 10,
    minPoolSize: 0,
  };

  try {
    await mongoose.connect(uri, options);
  } catch (err) {
    console.error('❌  Initial MongoDB connection failed:', err.message);
    console.log('🔄  Retrying connection in 5 seconds…');
    setTimeout(connectDB, 5_000);
  }
};

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
