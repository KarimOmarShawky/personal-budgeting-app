/**
 * Blueprints (Types)
 * ------------------
 * These interfaces are intentionally small and beginner-friendly.
 * They are used by `FinanceManager` and `ReportGenerator` to ensure type-safety.
 */

export enum Category {
  Food = 'Food',
  Transport = 'Transport',
  Education = 'Education',
  Entertainment = 'Entertainment',
  Bills = 'Bills',
  Health = 'Health',
  Shopping = 'Shopping',
  Other = 'Other',
}

export type TransactionType = 'income' | 'expense';

export interface User {
  id: string;
  fullName: string;
  email: string;
  totalBalance: number;
}

export interface Transaction {
  id: string;
  amount: number;
  date: Date;
  description?: string;
  category: Category;
  type: TransactionType;
}

export interface Budget {
  category: Category;
  limit: number;
  spent: number;
}

export type MonthlySummary = {
  month: string; // "YYYY-MM"
  income: number;
  expenses: number;
  balance: number;
};

