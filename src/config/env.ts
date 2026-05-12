import dotenv from 'dotenv';
dotenv.config();

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret && process.env.NODE_ENV === 'production') {
  // Refuse to start with a default secret in production.
  throw new Error('JWT_SECRET must be set in production');
}

/**
 * Comma-separated list of origins that are allowed to call the API from a browser.
 * In dev we don't enforce it (CORS middleware will reflect the request origin).
 * Example: ALLOWED_ORIGINS=https://budgetwise-fcai-karim.netlify.app,https://my-custom-domain.com
 */
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

export const CONFIG = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  JWT_SECRET: jwtSecret || 'fallback_dev_secret_change_me',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  PORT: Number(process.env.PORT) || 3000,
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/personal_budgeting_app',
  ALLOWED_ORIGINS: allowedOrigins,
};

export const isProduction = CONFIG.NODE_ENV === 'production';
