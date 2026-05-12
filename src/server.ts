import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import authRoutes    from './routes/authRoutes';
import financeRoutes from './routes/financeRoutes';
import reportRoutes  from './routes/reportRoutes';
import budgetRoutes  from './routes/budgetRoutes';
import { CONFIG, isProduction } from './config/env';
import { connectToDatabase } from './db/connect';

dotenv.config();

const app: Application = express();
const PORT = CONFIG.PORT;

// ── CORS ───────────────────────────────────────────────────────────────
// In dev: reflect any origin so localhost:3000 / 5500 etc. just work.
// In prod: only allow origins listed in ALLOWED_ORIGINS (or any if empty).
const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // No origin (curl / server-to-server / same-origin) is always allowed.
    if (!origin) return callback(null, true);
    if (!isProduction || CONFIG.ALLOWED_ORIGINS.length === 0) {
      return callback(null, true);
    }
    if (CONFIG.ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
};
app.use(cors(corsOptions));
// Preflight requests for any route.
app.options('*', cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// Health check (used by Render/uptime monitors).
app.get('/healthz', (_req: Request, res: Response) =>
  res.json({ status: 'ok', env: CONFIG.NODE_ENV, uptime: process.uptime() })
);

// API v1
app.use('/api/v1/auth',     authRoutes);
app.use('/api/v1/finance',  financeRoutes);
app.use('/api/v1/reports',  reportRoutes);
app.use('/api/v1/budgets',  budgetRoutes);

// SPA page routes
const page = (file: string) => (_req: Request, res: Response) =>
  res.sendFile(path.join(__dirname, '../public', file));

app.get('/',             page('index.html'));
app.get('/dashboard',    page('dashboard.html'));
app.get('/transactions', page('transactions.html'));
app.get('/budgets',      page('budgets.html'));
app.get('/reports',      page('reports.html'));
app.get('/profile',      page('profile.html'));
app.get('/signup',       page('signup.html'));
app.get('/login',        page('login.html'));

// JSON 404 for API routes, HTML 404 for everything else
app.use('/api', (_req: Request, res: Response) => res.status(404).json({ error: 'Not found' }));
app.use((_req: Request, res: Response) => res.status(404).send('<h1>404 – Page Not Found</h1>'));

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
});

const startServer = async () => {
  try {
    console.log('------------------------------------------');
    console.log('🔍 [1/3] Environment check…');
    console.log(`📍 NODE_ENV : ${CONFIG.NODE_ENV}`);
    console.log(`📍 Database : ${CONFIG.MONGODB_URI.replace(/\/\/[^@]+@/, '//<redacted>@')}`);
    console.log(`📍 Port     : ${CONFIG.PORT}`);
    console.log(`📍 CORS     : ${CONFIG.ALLOWED_ORIGINS.length ? CONFIG.ALLOWED_ORIGINS.join(', ') : '(any in dev)'}`);

    console.log('⏳ [2/3] Connecting to MongoDB…');
    await connectToDatabase();
    console.log('✅ [2/3] MongoDB connected!');

    console.log('🚀 [3/3] Starting Express…');
    app.listen(PORT, () => {
      console.log(`
==========================================
🎉 SERVER IS LIVE
📡  http://localhost:${PORT}
🏠  http://localhost:${PORT}/dashboard
🔐  http://localhost:${PORT}/api/v1
==========================================`);
    });
  } catch (err) {
    console.error('❌ CRITICAL: Server failed to start.', err instanceof Error ? err.message : err);
    process.exit(1);
  }
};

startServer();
