const mongoose = require('mongoose');

// ─── Sub-schema: Note ──────────────────────────────────────────────────────
const NoteSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: [true, 'Note text is required'],
      trim: true,
      maxlength: [2000, 'Note cannot exceed 2000 characters'],
    },
    createdAt: {
      type: Date,
      default: () => new Date(),
    },
  },
  { _id: true }
);

// ─── Main Schema: Job ──────────────────────────────────────────────────────
const JobSchema = new mongoose.Schema(
  {
    // ── Core Fields ──────────────────────────────────────────────────────
    company: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
      maxlength: [200, 'Company name cannot exceed 200 characters'],
    },

    role: {
      type: String,
      required: [true, 'Job role / title is required'],
      trim: true,
      maxlength: [200, 'Role cannot exceed 200 characters'],
    },

    // ── Status Pipeline ───────────────────────────────────────────────────
    status: {
      type: String,
      enum: {
        values: ['applied', 'screening', 'interview', 'offer', 'rejected'],
        message: '{VALUE} is not a valid status',
      },
      default: 'applied',
      index: true,
    },

    // ── Timestamps ────────────────────────────────────────────────────────
    appliedAt: {
      type: Date,
      default: () => new Date(),
    },

    lastActivityAt: {
      type: Date,
    },

    snoozedUntil: {
      type: Date,
      default: null,
    },

    // ── Source Channel ────────────────────────────────────────────────────
    source: {
      type: String,
      enum: {
        values: ['linkedin', 'referral', 'cold', 'jobboard', 'other'],
        message: '{VALUE} is not a valid source',
      },
      default: 'other',
    },

    // ── Notes ─────────────────────────────────────────────────────────────
    notes: {
      type: [NoteSchema],
      default: [],
    },

    // ── Resume AI Score ───────────────────────────────────────────────────
    resumeMatchScore: {
      type: Number,
      min: [0, 'Score cannot be below 0'],
      max: [100, 'Score cannot exceed 100'],
      default: null,
    },

    // ── Follow-up Tracking ────────────────────────────────────────────────
    followUpCount: {
      type: Number,
      default: 0,
      min: [0, 'Follow-up count cannot be negative'],
    },

    // ── Owner ─────────────────────────────────────────────────────────────
    // Stored as String now so no User collection is required during dev.
    // When auth is re-enabled, change type to:
    //   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
    userId: {
      type: String,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,           // adds createdAt + updatedAt automatically
    versionKey: false,          // removes __v field
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Virtual: daysInCurrentStatus ─────────────────────────────────────────
JobSchema.virtual('daysInCurrentStatus').get(function () {
  const base = this.lastActivityAt || this.appliedAt;
  if (!base) return null;
  return Math.floor((Date.now() - new Date(base).getTime()) / 86_400_000);
});

// ─── Virtual: isSnoozed ───────────────────────────────────────────────────
JobSchema.virtual('isSnoozed').get(function () {
  return this.snoozedUntil != null && new Date(this.snoozedUntil) > new Date();
});

// ─── Pre-save Hook: update lastActivityAt on status change ────────────────
JobSchema.pre('save', function (next) {
  // isModified() is true on new docs too, so use isNew to skip the initial save
  if (!this.isNew && this.isModified('status')) {
    this.lastActivityAt = new Date();
  }

  // Initialise lastActivityAt for brand-new jobs
  if (this.isNew && !this.lastActivityAt) {
    this.lastActivityAt = this.appliedAt || new Date();
  }

  next();
});

// ─── Indexes ──────────────────────────────────────────────────────────────
JobSchema.index({ userId: 1, status: 1, appliedAt: -1 });  // primary query path
JobSchema.index({ userId: 1, company: 'text', role: 'text' });  // full-text per user
JobSchema.index({ snoozedUntil: 1 }, { sparse: true });

// ─── Model ────────────────────────────────────────────────────────────────
const Job = mongoose.model('Job', JobSchema);

module.exports = Job;
