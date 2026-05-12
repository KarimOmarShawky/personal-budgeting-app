import mongoose from 'mongoose';

// `FilterQuery`/`SortOrder` are not exported as named members in every Mongoose
// release stream. Re-declare structural aliases locally to stay version-portable.
type FilterQuery<T = any> = Record<string, any>;
type SortOrder = 1 | -1 | 'asc' | 'desc' | 'ascending' | 'descending';
import { TransactionModel } from '../models/Transaction';
import { DataRepository } from './DataRepository';
import { Transaction } from '../types';

/**
 * Query options for a paginated, filtered transactions list.
 * All fields are optional; callers pass only what they want to apply.
 */
export interface TransactionQuery {
  userId: string;
  /** Free-text search against description (case-insensitive, partial match). */
  q?: string;
  /** Restrict to a single type. */
  type?: 'income' | 'expense';
  /** Restrict to a single category. */
  category?: string;
  /** Inclusive lower bound on dateTime. */
  from?: Date;
  /** Inclusive upper bound on dateTime. */
  to?: Date;
  /** Sort field — one of: dateTime, amount, category, type. */
  sort?: 'dateTime' | 'amount' | 'category' | 'type';
  /** Sort order — asc or desc. */
  order?: 'asc' | 'desc';
  /** 1-indexed page number. */
  page?: number;
  /** Items per page (max 200). */
  limit?: number;
}

export interface TransactionPage<T = any> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export class TransactionRepo implements DataRepository<Transaction> {
  private static instance: TransactionRepo | null = null;
  private constructor() {}

  static getInstance(): TransactionRepo {
    if (!TransactionRepo.instance) TransactionRepo.instance = new TransactionRepo();
    return TransactionRepo.instance;
  }

  async findAll(): Promise<any[]> {
    return TransactionModel.find().sort({ dateTime: -1 });
  }

  /** Plain owner-scoped find, used by services that need to walk every transaction. */
  async findByUserId(userId: string): Promise<any[]> {
    return TransactionModel.find({ userId: new mongoose.Types.ObjectId(userId) }).sort({ dateTime: -1 });
  }

  /**
   * Build a Mongo filter for a transaction query.
   * Extracted so list + export + count can reuse the exact same predicate.
   */
  buildFilter(q: TransactionQuery): FilterQuery<any> {
    const filter: FilterQuery<any> = { userId: new mongoose.Types.ObjectId(q.userId) };

    if (q.type) filter.type = q.type;
    if (q.category) filter.category = q.category;

    if (q.from || q.to) {
      filter.dateTime = {};
      if (q.from) (filter.dateTime as any).$gte = q.from;
      if (q.to) (filter.dateTime as any).$lte = q.to;
    }

    if (q.q && q.q.trim()) {
      // Case-insensitive partial match on description.
      // Escape regex metacharacters to make the search literal.
      const escaped = q.q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.description = { $regex: escaped, $options: 'i' };
    }
    return filter;
  }

  /**
   * Paginated query with optional search/sort/filter.
   * Returns items + pagination metadata.
   */
  async findPaginated(q: TransactionQuery): Promise<TransactionPage> {
    const page = Math.max(1, q.page ?? 1);
    const limit = Math.min(200, Math.max(1, q.limit ?? 25));
    const sortField = q.sort ?? 'dateTime';
    const sortOrder: SortOrder = q.order === 'asc' ? 1 : -1;

    const filter = this.buildFilter(q);

    const [items, total] = await Promise.all([
      TransactionModel.find(filter)
        .sort({ [sortField]: sortOrder, _id: sortOrder })
        .skip((page - 1) * limit)
        .limit(limit),
      TransactionModel.countDocuments(filter),
    ]);

    return {
      items,
      total,
      page,
      limit,
      pages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  /** Stream-friendly fetch for exports — no pagination, but still owner-scoped. */
  async findForExport(q: TransactionQuery): Promise<any[]> {
    const filter = this.buildFilter(q);
    const sortField = q.sort ?? 'dateTime';
    const sortOrder: SortOrder = q.order === 'asc' ? 1 : -1;
    return TransactionModel.find(filter).sort({ [sortField]: sortOrder, _id: sortOrder });
  }

  async create(entity: any): Promise<any> {
    return TransactionModel.create(entity);
  }

  async findById(id: string): Promise<any | null> {
    return TransactionModel.findById(id);
  }

  /** Find a transaction only if it belongs to the given user (prevents cross-user access). */
  async findByIdAndUserId(id: string, userId: string): Promise<any | null> {
    return TransactionModel.findOne({
      _id: new mongoose.Types.ObjectId(id),
      userId: new mongoose.Types.ObjectId(userId),
    });
  }

  async update(id: string, patch: any): Promise<any | null> {
    return TransactionModel.findByIdAndUpdate(id, patch, { new: true, runValidators: true });
  }

  /** Update only if the transaction is owned by the user (security). */
  async updateByIdAndUserId(id: string, userId: string, patch: any): Promise<any | null> {
    return TransactionModel.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(id), userId: new mongoose.Types.ObjectId(userId) },
      patch,
      { new: true, runValidators: true }
    );
  }

  async delete(id: string): Promise<boolean> {
    const result = await TransactionModel.findByIdAndDelete(id);
    return !!result;
  }

  async deleteByIdAndUserId(id: string, userId: string): Promise<boolean> {
    const result = await TransactionModel.findOneAndDelete({
      _id: new mongoose.Types.ObjectId(id),
      userId: new mongoose.Types.ObjectId(userId),
    });
    return !!result;
  }
}
