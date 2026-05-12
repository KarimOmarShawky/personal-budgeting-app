import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { CONFIG } from '../config/env';

export type RequestUser = {
  userId: string;
  role: 'user' | 'admin';
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: RequestUser;
    }
  }
}

/**
 * Verify JWT and attach `req.user`.
 * If missing/invalid, returns 401.
 */export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.header('Authorization');
  let token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : undefined;

  // NEW: Also check for token in query parameters for downloads
  if (!token && req.query.token) {
    token = req.query.token as string;
  }

  if (!token) return res.status(401).json({ error: 'Missing Authorization token' });

  try {
    const decoded = jwt.verify(token, CONFIG.JWT_SECRET) as any;
    const userId = String(decoded?.userId ?? '');
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ error: 'Stale session — please log in again.' });
    }
    req.user = { userId, role: decoded.role };
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Role guard for admin-only endpoints.
 */
export function requireRole(role: RequestUser['role']) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (req.user.role !== role) return res.status(403).json({ error: 'Forbidden' });
    return next();
  };
}

