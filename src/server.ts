import express, { Application, Request, Response } from 'express';
import path from 'path';
import dotenv from 'dotenv';
import authRoutes    from './routes/authRoutes';
import financeRoutes from './routes/financeRoutes';
import reportRoutes  from './routes/reportRoutes';
import budgetRoutes  from './routes/budgetRoutes';
import { CONFIG }          from './config/env';
import { connectToDatabase } from './db/connect';

dotenv.config();

const app: Application = express();
const PORT = CONFIG.PORT;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// API v1
app.use('/api/v1/auth',     authRoutes);
app.use('/api/v1/finance',  financeRoutes);
app.use('/api/v1/reports',  reportRoutes);
app.use('/api/v1/budgets',  budgetRoutes);

// SPA page routes
const page = (file: string) => (_req: Request, res: Response) =>
  res.sendFile(path.join(__dirname, '../public', file));

app.get('/',             page('dashboard.html'));
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
    console.log(`📍 Database : ${CONFIG.MONGODB_URI}`);
    console.log(`📍 Port     : ${CONFIG.PORT}`);

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
