import bcrypt from 'bcryptjs';
import mongoose, { HydratedDocument, Model, Schema } from 'mongoose';

/**
 * User settings captured from the SRS (profile/settings story).
 *
 * Notes:
 * - Currency/language are simple strings because the SRS only defines validation rules,
 *   and keeping them flexible makes demos easier.
 */
export type UserSettings = {
  currency?: string; // e.g., "EGP", "USD" (SRS: <3 characters)
  language?: string; // e.g., "English", "Arabic"
  notifications?: {
    budgetAlerts?: boolean;
    goalReminders?: boolean;
  };
};

/**
 * Stored user record in the database.
 * Passwords are stored as a bcrypt hash, never plaintext.
 */
export interface User {
  _id: mongoose.Types.ObjectId;
  /**
   * The user's real/display name.
   * (SRS/SDS: "Full name" is required on registration.)
   */
  fullName: string;
  /**
   * Backward-compatible alias for earlier code that used "username".
   * Prefer `fullName` going forward.
   */
  username?: string;
  email: string;
  /**
   * Hashed password (never store plaintext passwords).
   */
  passwordHash: string;
  /**
   * Total money the user currently has (SDS: "totalBalance").
   * Note: your current app doesn't persist transactions yet, so this is a simple aggregate field.
   */
  totalBalance: number;
  role: 'user' | 'admin';
  settings?: UserSettings;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Safe shape to return to clients (no password).
 */
export type PublicUser = Omit<User, 'passwordHash'>;

export type NewUserInput = {
  fullName?: string;
  username?: string;
  email: string;
  password: string; // plaintext input
  confirmPassword?: string;
  role?: 'user' | 'admin';
  settings?: UserSettings;
};

/**
 * Convert a stored user into a safe response object.
 */
export function toPublicUser(user: User): PublicUser {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, ...rest } = user;
  return rest;
}

export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

export function isValidEmail(email: string): boolean {
  // Pragmatic validation; the SRS requires a valid email format and uniqueness (uniqueness is DB-level).
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * SRS password rule:
 * - at least 8 characters
 * - includes an uppercase letter
 * - includes a number
 * - includes a special character
 */
export function isStrongPassword(password: string): boolean {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /\d/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}

export function passwordsMatch(password: string, confirmPassword?: string): boolean {
  return typeof confirmPassword !== 'string' || password === confirmPassword;
}

/**
 * Hash a plaintext password using bcrypt.
 */
export async function hashPassword(plainPassword: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plainPassword, salt);
}

/**
 * Compare a plaintext password with a stored bcrypt hash.
 */
export async function verifyPassword(
  plainPassword: string,
  passwordHash: string
): Promise<boolean> {
  return bcrypt.compare(plainPassword, passwordHash);
}

/**
 * Validate registration input and build a ready-to-persist user object.
 *
 * We keep validation here because it’s easy to explain:
 * - Controllers handle HTTP parsing/response.
 * - Services handle business rules (uniqueness, role checks, etc.).
 * - This module centralizes **account** validation rules from the SRS.
 */
export async function createUser(input: NewUserInput): Promise<Omit<User, '_id' | 'createdAt' | 'updatedAt'>> {
  const fullName = (input.fullName ?? input.username ?? '').trim();
  if (!fullName) {
    throw new Error('Full name is required');
  }
  const email = normalizeEmail(input.email);
  if (!isValidEmail(email)) {
    throw new Error('Invalid email format');
  }
  if (!isStrongPassword(input.password)) {
    throw new Error(
      'Password must be at least 8 characters and include an uppercase letter, a number, and a special character'
    );
  }
  if (!passwordsMatch(input.password, input.confirmPassword)) {
    throw new Error('Confirm password must match password');
  }

  return {
    fullName,
    username: input.username?.trim() || undefined,
    email,
    passwordHash: await hashPassword(input.password),
    totalBalance: 0,
    role: input.role ?? 'user',
    settings: input.settings,
  };
}

/**
 * --- Mongoose schema/model ---
 *
 * This app uses Mongoose as the “real DB layer”.
 * We export the model from the same module to keep things simple for students:
 * importing `UserModel` is all you need for DB operations.
 */

export type UserDoc = HydratedDocument<User>;

export type UserModelType = Model<User>;

const UserSettingsSchema = new Schema<UserSettings>(
  {
    currency: { type: String, trim: true, maxlength: 3 },
    language: { type: String, trim: true, maxlength: 10 },
    notifications: {
      budgetAlerts: { type: Boolean, default: true },
      goalReminders: { type: Boolean, default: true },
    },
  },
  { _id: false }
);

const UserSchema = new Schema<User>(
  {
    fullName: { type: String, required: true, trim: true, maxlength: 100 },
    username: { type: String, trim: true, maxlength: 100 },
    email: { type: String, required: true, unique: true, index: true, trim: true, maxlength: 100 },
    passwordHash: { type: String, required: true },
    totalBalance: { type: Number, required: true, default: 0 },
    role: { type: String, required: true, enum: ['user', 'admin'], default: 'user' },
    settings: { type: UserSettingsSchema, required: false },
  },
  {
    timestamps: true,
    toJSON: {
      /**
       * Hide sensitive fields automatically when `res.json(userDoc)` happens.
       * That keeps controllers simpler and prevents accidental leaks.
       */
      transform(_doc, ret) {
        // `ret` is a plain JS object produced by Mongoose (not strongly typed).
        // Treat it as a record so TS allows deleting properties.
        delete (ret as Record<string, unknown>).passwordHash;
        return ret;
      },
    },
  }
);

UserSchema.pre('save', function normalize() {
  // Make sure emails are always stored normalized, even if a dev forgets in a service.
  if (this.isModified('email')) {
    this.email = normalizeEmail(this.email);
  }
});

export const UserModel: UserModelType =
  (mongoose.models.User as UserModelType) || mongoose.model<User>('User', UserSchema);