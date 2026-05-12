import { Category, MonthlySummary, TransactionType } from '../types';
import { FinanceManager } from './FinanceManager';
import { ExportStrategy } from '../patterns/strategy/ExportStrategy';

/**
 * Strategy interface.
 * Each strategy generates a different “view” of the same data.
 */
export interface ReportStrategy<T> {
  generate(input: { year: number; month1To12: number; userId: string; finance: FinanceManager }): Promise<T>;
}

export type MonthlySummaryReport = MonthlySummary;

export type CategoryDistributionReport = {
  month: string; // "YYYY-MM"
  type: TransactionType;
  totals: Record<Category, number>;
};

/**
 * Concrete strategy: monthly totals (income/expenses/balance).
 */
export class MonthlySummaryStrategy implements ReportStrategy<MonthlySummaryReport> {
  async generate(input: { year: number; month1To12: number; userId: string; finance: FinanceManager }): Promise<MonthlySummaryReport> {
    return input.finance.getMonthlySummary(input.year, input.month1To12, input.userId);
  }
}

/**
 * Concrete strategy: distribution by category for a month.
 * Useful for pie charts.
 */
export class CategoryDistributionStrategy implements ReportStrategy<CategoryDistributionReport> {
  constructor(private readonly type: TransactionType) {}

  async generate(
    input: { year: number; month1To12: number; userId: string; finance: FinanceManager }
  ): Promise<CategoryDistributionReport> {
    const totals = await input.finance.getCategoryTotals(input.year, input.month1To12, this.type, input.userId);
    const month = `${input.year}-${String(input.month1To12).padStart(2, '0')}`;
    return { month, type: this.type, totals };
  }
}

/**
 * ReportGenerator is the strategy “context”.
 * It can switch strategies based on what the caller needs.
 */
export class ReportGenerator {
  private strategy: ReportStrategy<any>;
  private exportStrategy?: ExportStrategy<any>;

  constructor(strategy: ReportStrategy<any>, exportStrategy?: ExportStrategy<any>) {
    this.strategy = strategy;
    this.exportStrategy = exportStrategy;
  }

  /**
   * Switch strategy at runtime.
   */
  setStrategy<T>(strategy: ReportStrategy<T>) {
    this.strategy = strategy;
  }

  /**
   * Set export strategy.
   */
  setExportStrategy<T>(exportStrategy: ExportStrategy<T>) {
    this.exportStrategy = exportStrategy;
  }

  /**
   * Execute the current strategy.
   */
  async generate<T>(params: { year: number; month1To12: number; userId: string; finance: FinanceManager }): Promise<T> {
    return (await this.strategy.generate(params)) as T;
  }

  async export<T>(params: { year: number; month1To12: number; userId: string; finance: FinanceManager }): Promise<T> {
    if (!this.exportStrategy) {
      throw new Error('Export strategy (PDF, CSV, or Chart) must be set before calling export().');
    }
    const report = await this.generate(params);
    return await this.exportStrategy.export(report);
  }
}

