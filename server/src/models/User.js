const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

// ─── Schema ───────────────────────────────────────────────────────────────────
const UserSchema = new mongoose.Schema(
  {
    email: {
      type:      String,
      required:  [true, 'Email is required'],
      unique:    true,
      trim:      true,
      lowercase: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,})+$/,
        'Please enter a valid email address',
      ],
    },

    password: {
      type:      String,
      required:  [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      // Never expose the hashed password in API responses
      select:    false,
    },

    createdAt: {
      type:    Date,
      default: Date.now,
    },
  },
  {
    versionKey: false,
    // Exclude __v; createdAt is defined manually so we skip timestamps option
  }
);

// ─── Pre-save: hash password ──────────────────────────────────────────────────
UserSchema.pre('save', async function (next) {
  // Only re-hash if the password field was actually changed
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// ─── Instance method: comparePassword ─────────────────────────────────────────
/**
 * Compares a plain-text candidate password against the stored bcrypt hash.
 * Must be called on a document fetched with `.select('+password')`.
 */
UserSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// ─── Model ────────────────────────────────────────────────────────────────────
module.exports = mongoose.model('User', UserSchema);
