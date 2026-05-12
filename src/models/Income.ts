import { Transaction, TransactionType } from './Transaction';

/**
 * Convenience type for an income transaction.
 * We don’t store income/expense in separate collections; we use `Transaction.type`.
 */
export type Income = Omit<Transaction, 'type'> & { type: Extract<TransactionType, 'income'> };

