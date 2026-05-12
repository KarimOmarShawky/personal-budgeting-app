import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { CONFIG } from '../config/env';
import { UserRepository } from '../data/UserRepository';
import { NewUserInput, createUser, isValidEmail, toPublicUser } from '../models/User';

/**
 * AuthService — issues JWTs whose `userId` is always the Mongo ObjectId hex string.
 */
export class AuthService {
  private static users = UserRepository.getInstance();

  static async register(input: NewUserInput) {
    const userData = await createUser(input);

    const existing = await this.users.findByEmail(userData.email);
    if (existing) throw new Error('Email already exists');

    const stored = await this.users.create({
      fullName: userData.fullName,
      email: userData.email,
      totalBalance: userData.totalBalance,
      passwordHash: userData.passwordHash,
      role: userData.role,
    });

    const userId = String(stored._id);
    const token = jwt.sign({ userId, role: stored.role }, CONFIG.JWT_SECRET, {
      expiresIn: CONFIG.JWT_EXPIRES_IN as any,
    });

    return { token, user: toPublicUser(stored.toObject() as any) };
  }

  static async login(email: string, password: string) {
    if (!isValidEmail(email)) throw new Error('Invalid email or password');

    const user = await this.users.findByEmail(email);
    if (!user) throw new Error('Invalid email or password');

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new Error('Invalid email or password');

    const userId = String(user._id);
    const token = jwt.sign({ userId, role: user.role }, CONFIG.JWT_SECRET, {
      expiresIn: CONFIG.JWT_EXPIRES_IN as any,
    });

    return { token, user: toPublicUser(user.toObject() as any) };
  }

  static async getMe(userId: string) {
    const user = await this.users.findById(userId);
    if (!user) throw new Error('User not found');
    return {
      id: String(user._id),
      fullName: user.fullName,
      email: user.email,
      totalBalance: user.totalBalance,
      role: user.role,
    };
  }
}
