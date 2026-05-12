import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { UserRepository } from '../data/UserRepository';
import { UserModel } from '../models/User';
import { CONFIG } from '../config/env';
import { isStrongPassword, isValidEmail, normalizeEmail } from '../models/User';

const userRepo = UserRepository.getInstance();

function signToken(payload: { userId: string; email: string; role: 'user' | 'admin' }) {
  const options: SignOptions = { expiresIn: CONFIG.JWT_EXPIRES_IN as SignOptions['expiresIn'] };
  return jwt.sign(payload, CONFIG.JWT_SECRET, options);
}

export const signup = async (req: Request, res: Response) => {
  try {
    const { fullName, email, password } = req.body ?? {};

    if (!fullName || typeof fullName !== 'string' || !fullName.trim()) {
      return res.status(400).json({ error: 'Full name is required' });
    }
    if (!email || typeof email !== 'string' || !isValidEmail(email)) {
      return res.status(400).json({ error: 'A valid email is required' });
    }
    if (!password || typeof password !== 'string') {
      return res.status(400).json({ error: 'Password is required' });
    }
    if (!isStrongPassword(password)) {
      return res.status(400).json({
        error:
          'Password must be at least 8 characters and include an uppercase letter, a number, and a special character',
      });
    }

    const normalizedEmail = normalizeEmail(email);

    const existing = await userRepo.findByEmail(normalizedEmail);
    if (existing) {
      return res.status(409).json({ error: 'An account with that email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = await userRepo.create({
      fullName: fullName.trim(),
      email: normalizedEmail,
      totalBalance: 0,
      passwordHash,
      role: 'user',
    });

    const userId = String(newUser._id);
    const token = signToken({ userId, email: newUser.email, role: newUser.role });

    return res.status(201).json({
      message: 'User registered successfully!',
      token,
      user: {
        id: userId,
        fullName: newUser.fullName,
        email: newUser.email,
        totalBalance: newUser.totalBalance,
      },
    });
  } catch (error: any) {
    if (error?.code === 11000) {
      return res.status(409).json({ error: 'An account with that email already exists' });
    }
    const message = typeof error?.message === 'string' ? error.message : 'Signup failed';
    return res.status(500).json({ error: message });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body ?? {};

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await userRepo.findByEmail(email);
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const isPasswordValid = await userRepo.verifyPassword(user, password);
    if (!isPasswordValid) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const userId = String(user._id);
    const token = signToken({ userId, email: user.email, role: user.role });

    return res.json({
      token,
      user: {
        id: userId,
        fullName: user.fullName,
        email: user.email,
        totalBalance: user.totalBalance,
      },
      message: 'Login successful',
    });
  } catch (error: any) {
    const message = typeof error?.message === 'string' ? error.message : 'Login failed';
    return res.status(500).json({ error: message });
  }
};

/**
 * PATCH /api/v1/auth/me
 * Updates editable profile fields (currently: fullName).
 * Email/password changes have dedicated endpoints because they require extra checks.
 */
export const updateMe = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { fullName } = req.body ?? {};

    if (typeof fullName !== 'string' || !fullName.trim()) {
      return res.status(400).json({ error: 'Full name is required' });
    }
    if (fullName.trim().length > 100) {
      return res.status(400).json({ error: 'Full name must be at most 100 characters' });
    }

    const user = await userRepo.update(req.user.userId, { fullName: fullName.trim() });
    if (!user) return res.status(404).json({ error: 'User not found' });

    return res.json({
      user: {
        id: String(user._id),
        fullName: user.fullName,
        email: user.email,
        totalBalance: user.totalBalance,
      },
    });
  } catch (error: any) {
    const message = typeof error?.message === 'string' ? error.message : 'Failed to update profile';
    return res.status(500).json({ error: message });
  }
};

/**
 * POST /api/v1/auth/change-password
 * Verifies the current password before writing the new bcrypt hash.
 * Issues no new token — the existing JWT remains valid for the rest of its TTL.
 */
export const changePassword = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const { currentPassword, newPassword } = req.body ?? {};

    if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
      return res.status(400).json({ error: 'currentPassword and newPassword are required' });
    }
    if (!isStrongPassword(newPassword)) {
      return res.status(400).json({
        error:
          'New password must be at least 8 characters and include an uppercase letter, a number, and a special character',
      });
    }
    if (currentPassword === newPassword) {
      return res.status(400).json({ error: 'New password must differ from current password' });
    }

    // Fetch the full doc including passwordHash (toJSON strips it but the doc itself has it).
    const user = await UserModel.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Current password is incorrect' });

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();

    return res.json({ message: 'Password changed successfully' });
  } catch (error: any) {
    const message = typeof error?.message === 'string' ? error.message : 'Failed to change password';
    return res.status(500).json({ error: message });
  }
};

export const me = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const user = await userRepo.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({
      user: {
        id: String(user._id),
        fullName: user.fullName,
        email: user.email,
        totalBalance: user.totalBalance,
      },
    });
  } catch (error: any) {
    const message = typeof error?.message === 'string' ? error.message : 'Failed to load profile';
    return res.status(500).json({ error: message });
  }
};
