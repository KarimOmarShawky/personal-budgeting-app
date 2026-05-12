import { Transaction, TransactionType } from './Transaction';

/**
 * Convenience type for an expense transaction.
 * We don’t store income/expense in separate collections; we use `Transaction.type`.
 */
export type Expense = Omit<Transaction, 'type'> & { type: Extract<TransactionType, 'expense'> };

