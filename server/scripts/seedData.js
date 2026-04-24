require('dotenv').config();
const mongoose = require('mongoose');
const Job = require('../models/Job');

const MONGODB_URI = process.env.MONGODB_URI;
const TARGET_USER_ID = process.env.DEV_USER_ID || 'dev-user-001'; // Default if none provided

if (!MONGODB_URI) {
  console.error('ERROR: MONGODB_URI is not defined in .env');
  process.exit(1);
}

const sampleJobs = [
  {
    company: 'Google',
    role: 'SWE II',
    status: 'interview',
    source: 'referral',
    appliedAt: new Date(Date.now() - 5 * 86400000), // 5 days ago
    userId: TARGET_USER_ID,
    notes: [{ text: 'Technical interview scheduled for next Tuesday.' }]
  },
  {
    company: 'Anthropic',
    role: 'Frontend Engineer',
    status: 'screening',
    source: 'linkedin',
    appliedAt: new Date(Date.now() - 3 * 86400000), // 3 days ago
    userId: TARGET_USER_ID,
    notes: [{ text: 'HR reached out on LinkedIn.' }]
  },
  {
    company: 'Stripe',
    role: 'Full Stack Dev',
    status: 'applied',
    source: 'cold',
    appliedAt: new Date(Date.now() - 10 * 86400000), // 10 days ago (triggers reminders)
    userId: TARGET_USER_ID,
    notes: [{ text: 'Cold emailed the engineering manager.' }]
  },
  {
    company: 'Notion',
    role: 'React Developer',
    status: 'offer',
    source: 'referral',
    appliedAt: new Date(Date.now() - 15 * 86400000),
    userId: TARGET_USER_ID,
    notes: [{ text: 'Offer letter received! Need to negotiate equity.' }]
  },
  {
    company: 'Meta',
    role: 'Backend Engineer',
    status: 'rejected',
    source: 'jobboard',
    appliedAt: new Date(Date.now() - 20 * 86400000),
    userId: TARGET_USER_ID,
    notes: [{ text: 'Standard rejection after final round. Will re-apply in 6 months.' }]
  }
];

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB.');

    // Clear existing jobs for this user to avoid duplicates if running multiple times
    await Job.deleteMany({ userId: TARGET_USER_ID });
    console.log(`Cleared existing jobs for user: ${TARGET_USER_ID}`);

    await Job.insertMany(sampleJobs);
    console.log(`Successfully seeded ${sampleJobs.length} jobs.`);

    mongoose.connection.close();
    console.log('Done.');
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
}

seed();
