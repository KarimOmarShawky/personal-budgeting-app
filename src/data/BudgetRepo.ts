import { DataRepository } from './DataRepository';
import { Budget, Category } from '../types';

/**
 * BudgetRepo (Singleton)
 * In-memory budgets keyed by category.
 */
export class BudgetRepo implements DataRepository<Budget & { id: string }> {
  private static instance: BudgetRepo | null = null;
  private budgets: Array<Budget & { id: string }> = [];

  private constructor() {}

  static getInstance(): BudgetRepo {
    if (!BudgetRepo.instance) BudgetRepo.instance = new BudgetRepo();
    return BudgetRepo.instance;
  }

  async findAll(): Promise<Array<Budget & { id: string }>> {
    return [...this.budgets];
  }

  async findById(id: string): Promise<(Budget & { id: string }) | null> {
    return this.budgets.find((b) => b.id === id) ?? null;
  }

  async findByCategory(category: Category): Promise<(Budget & { id: string }) | null> {
    return this.budgets.find((b) => b.category === category) ?? null;
  }

  async create(entity: Budget & { id: string }): Promise<Budget & { id: string }> {
    this.budgets.push(entity);
    return entity;
  }

  async upsertByCategory(category: Category, limit: number): Promise<Budget & { id: string }> {
    const existing = await this.findByCategory(category);
    if (existing) {
      existing.limit = limit;
      return existing;
    }
    const created: Budget & { id: string } = { id: this.generateId(), category, limit, spent: 0 };
    await this.create(created);
    return created;
  }

  async update(id: string, patch: Partial<Budget & { id: string }>): Promise<(Budget & { id: string }) | null> {
    const budget = await this.findById(id);
    if (!budget) return null;
    Object.assign(budget, patch);
    return budget;
  }

  async delete(id: string): Promise<boolean> {
    const before = this.budgets.length;
    this.budgets = this.budgets.filter((b) => b.id !== id);
    return this.budgets.length !== before;
  }

  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }
}

