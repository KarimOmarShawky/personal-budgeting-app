import bcrypt from 'bcryptjs';
import { UserModel, User as UserType, UserDoc } from '../models/User';

export type StoredUser = UserType;

/**
 * UserRepository (Singleton) – thin Mongo wrapper around UserModel.
 */
export class UserRepository {
  private static instance: UserRepository | null = null;
  private constructor() {}

  static getInstance(): UserRepository {
    if (!UserRepository.instance) UserRepository.instance = new UserRepository();
    return UserRepository.instance;
  }

  async findByEmail(email: string): Promise<UserDoc | null> {
    return UserModel.findOne({ email: email.toLowerCase().trim() });
  }

  async findById(id: string): Promise<UserDoc | null> {
    return UserModel.findById(id);
  }

  async create(entity: Partial<UserType> & { passwordHash: string; email: string; fullName: string }): Promise<UserDoc> {
    return UserModel.create(entity);
  }

  async findAll(): Promise<UserDoc[]> {
    return UserModel.find();
  }

  async update(id: string, patch: Partial<UserType>): Promise<UserDoc | null> {
    return UserModel.findByIdAndUpdate(id, patch, { new: true });
  }

  async delete(id: string): Promise<boolean> {
    const result = await UserModel.findByIdAndDelete(id);
    return !!result;
  }

  async verifyPassword(user: { passwordHash: string }, plainPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, user.passwordHash);
  }
}
