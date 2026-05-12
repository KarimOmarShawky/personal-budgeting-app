import dotenv from 'dotenv';
dotenv.config();

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret && process.env.NODE_ENV === 'production') {
  // Refuse to start with a default secret in production.
  throw new Error('JWT_SECRET must be set in production');
}

export const CONFIG = {
  JWT_SECRET: jwtSecret || 'fallback_dev_secret_change_me',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  PORT: Number(process.env.PORT) || 3000,
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/personal_budgeting_app',
};
