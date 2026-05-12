import mongoose from 'mongoose';
import { Budget, Category, MonthlySummary, Transaction, TransactionType } from '../types';
import { BudgetRepo } from '../data/BudgetRepo';
import { TransactionRepo, TransactionQuery, TransactionPage } from '../data/TransactionRepo';
import { Subject } from '../patterns/observer/Subject';
import { AlertSystem } from '../patterns/observer/AlertSystem';
import { ExportStrategy } from '../patterns/strategy/ExportStrategy';

/**
 * FinanceManager (Singleton + Observer)
 * All data-fetching methods are scoped to a userId to prevent cross-user data leakage.
 */
export class FinanceManager extends Subject {
  private static instance: FinanceManager | null = null;
  private readonly transactionsRepo = TransactionRepo.getInstance();
  private readonly alertSystem = new AlertSystem();

  private constructor() {
    super();
    this.attach(this.alertSystem);
  }

  static getInstance(): FinanceManager {
    if (!FinanceManager.instance) {
      FinanceManager.instance = new FinanceManager();
    }
    return FinanceManager.instance;
  }

  /** Add a new transaction for a specific user */
  async addTransaction(input: {
    amount: number;
    date?: Date;
    description?: string;
    category: string;
    type: TransactionType;
    userId: string;
  }): Promise<any> {
    this.assertValidAmount(input.amount);

    const tx = await this.transactionsRepo.create({
      amount:        input.amount,
      dateTime:      input.date ?? new Date(),
      description:   input.description,
      category:      input.category,
      type:          input.type,
      userId:        new mongoose.Types.ObjectId(input.userId),
    });

    this.notify(`New ${input.type}: ${input.category} – ${input.amount}`, tx);
    return tx;
  }

  /** Remove a transaction, verifying ownership */
  async removeTransaction(transactionId: string, userId: string): Promise<boolean> {
    return this.transactionsRepo.deleteByIdAndUserId(transactionId, userId);
  }

  /**
   * Update an owned transaction. Validates amount if present.
   * Only known fields are written through — silently drops unknowns.
   */
  async updateTransaction(
    transactionId: string,
    userId: string,
    patch: {
      amount?: number;
      date?: Date;
      description?: string;
      category?: string;
      type?: TransactionType;
    }
  ): Promise<any | null> {
    const update: any = {};
    if (patch.amount !== undefined) {
      this.assertValidAmount(patch.amount);
      update.amount = patch.amount;
    }
    if (patch.date !== undefined) update.dateTime = patch.date;
    if (patch.description !== undefined) update.description = patch.description;
    if (patch.category !== undefined) update.category = patch.category;
    if (patch.type !== undefined) update.type = patch.type;

    if (Object.keys(update).length === 0) {
      // Nothing to update — surface the unchanged record so the caller can confirm.
      return this.transactionsRepo.findByIdAndUserId(transactionId, userId);
    }
    return this.transactionsRepo.updateByIdAndUserId(transactionId, userId, update);
  }

  /** Return all transactions for a user (most recent first) */
  async getTransactions(userId: string): Promise<any[]> {
    return this.transactionsRepo.findByUserId(userId);
  }

  /** Server-side filtered/paginated/searched/sorted transactions list. */
  async queryTransactions(q: TransactionQuery): Promise<TransactionPage> {
    return this.transactionsRepo.findPaginated(q);
  }

  /** Same filters as queryTransactions, but returns the full (unpaginated) match for export. */
  async exportTransactions(q: TransactionQuery): Promise<any[]> {
    return this.transactionsRepo.findForExport(q);
  }

  /** Compute the current total balance for a user */
  async getTotalBalance(userId: string): Promise<number> {
    const all = await this.transactionsRepo.findByUserId(userId);
    return all.reduce((acc, tx) => acc + this.signedAmount(tx.type, tx.amount), 0);
  }

  /** Monthly income/expense totals for a user */
  async getMonthlyIncomeExpenses(
    year: number,
    month1To12: number,
    userId: string
  ): Promise<{ income: number; expenses: number }> {
    const { start, end } = this.monthRange(year, month1To12);
    const all = await this.transactionsRepo.findByUserId(userId);

    let income = 0;
    let expenses = 0;

    for (const tx of all) {
      // Use dateTime (the DB field); fall back to dateTime or createdAt
      const txDate = tx.dateTime ?? tx.createdAt;
      if (!txDate || txDate < start || txDate >= end) continue;
      if (tx.type === 'income') income += tx.amount;
      else expenses += tx.amount;
    }

    return { income, expenses };
  }

  /** Combined summary used by reports and the dashboard */
  async getMonthlySummary(year: number, month1To12: number, userId: string): Promise<MonthlySummary> {
    const { income, expenses } = await this.getMonthlyIncomeExpenses(year, month1To12, userId);
    const balance = income - expenses;
    const month = `${year}-${String(month1To12).padStart(2, '0')}`;
    return { month, income, expenses, balance };
  }

  /** Category distribution for a month (used by reports) */
  async getCategoryTotals(
    year: number,
    month1To12: number,
    type: TransactionType,
    userId: string
  ): Promise<Record<Category, number>> {
    const { start, end } = this.monthRange(year, month1To12);
    const all = await this.transactionsRepo.findByUserId(userId);

    const totals: Record<string, number> = {
      [Category.Food]: 0,
      [Category.Transport]: 0,
      [Category.Education]: 0,
      [Category.Entertainment]: 0,
      [Category.Bills]: 0,
      [Category.Health]: 0,
      [Category.Shopping]: 0,
      [Category.Other]: 0,
    };

    for (const tx of all) {
      if (tx.type !== type) continue;
      const txDate = tx.dateTime ?? tx.createdAt;
      if (!txDate || txDate < start || txDate >= end) continue;
      if (tx.category in totals) {
        totals[tx.category] += tx.amount;
      } else {
        totals[Category.Other] += tx.amount;
      }
    }

    return totals as Record<Category, number>;
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private signedAmount(type: TransactionType, amount: number): number {
    return type === 'income' ? amount : -amount;
  }

  private assertValidAmount(amount: number) {
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error('Amount must be a positive number.');
    }
    if (amount > 9_999_999.99) {
      throw new Error('Amount is too large (max 9,999,999.99).');
    }
  }

  private monthRange(year: number, month1To12: number): { start: Date; end: Date } {
    if (month1To12 < 1 || month1To12 > 12) throw new Error('Month must be between 1 and 12.');
    return {
      start: new Date(year, month1To12 - 1, 1, 0, 0, 0, 0),
      end:   new Date(year, month1To12,     1, 0, 0, 0, 0),
    };
  }
}
