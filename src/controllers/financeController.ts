import { Request, Response } from 'express';
import { Parser as CsvParser } from 'json2csv';
import { FinanceManager } from '../services/FinanceManager';
import { TransactionQuery } from '../data/TransactionRepo';

const finance = FinanceManager.getInstance();

/** Categories the UI advertises — used to soft-validate input on the server. */
const ALLOWED_CATEGORIES = new Set([
  'Food', 'Transport', 'Education', 'Entertainment',
  'Bills', 'Health', 'Shopping', 'Other',
]);
const ALLOWED_TYPES = new Set(['income', 'expense']);
const ALLOWED_SORTS = new Set(['dateTime', 'amount', 'category', 'type']);

/**
 * Normalize a Mongoose transaction document into a clean API response shape.
 * Keeps the wire contract stable even if the storage schema drifts.
 */
function normalizeTransaction(tx: any) {
  return {
    id:            tx._id?.toString() ?? tx.id,
    amount:        tx.amount,
    date:          tx.dateTime ?? tx.createdAt,
    description:   tx.description ?? '',
    category:      tx.category,
    type:          tx.type,
    paymentMethod: tx.paymentMethod ?? null,
  };
}

/** Centralized input validation for create + update payloads. */
function validateTxInput(body: any, { partial = false } = {}): string | null {
  const { amount, type, category, description, date } = body ?? {};

  if (!partial || amount !== undefined) {
    if (amount === undefined || amount === null || amount === '') {
      return 'amount is required';
    }
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) return 'amount must be a positive number';
    if (n > 9_999_999.99) return 'amount is too large (max 9,999,999.99)';
  }
  if (!partial || type !== undefined) {
    if (!type || !ALLOWED_TYPES.has(String(type))) return 'type must be "income" or "expense"';
  }
  if (!partial || category !== undefined) {
    if (!category || typeof category !== 'string') return 'category is required';
    if (!ALLOWED_CATEGORIES.has(category)) return `category must be one of: ${[...ALLOWED_CATEGORIES].join(', ')}`;
  }
  if (description !== undefined && typeof description === 'string' && description.length > 200) {
    return 'description must be at most 200 characters';
  }
  if (date !== undefined && date !== '' && date !== null) {
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return 'date is not a valid date';
  }
  return null;
}

/** Coerce a possibly-array query param into a single string. */
function asString(v: unknown): string | undefined {
  if (typeof v === 'string') return v;
  if (Array.isArray(v) && typeof v[0] === 'string') return v[0];
  return undefined;
}

/** Parse a query-string into a TransactionQuery, validating each parameter. */
function parseQuery(req: Request): TransactionQuery {
  const userId = req.user!.userId;
  const out: TransactionQuery = { userId };

  const q = asString(req.query.q)?.trim();
  if (q) out.q = q;

  const type = asString(req.query.type);
  if (type && ALLOWED_TYPES.has(type)) out.type = type as 'income' | 'expense';

  const category = asString(req.query.category);
  if (category && ALLOWED_CATEGORIES.has(category)) out.category = category;

  const from = asString(req.query.from);
  if (from) {
    const d = new Date(from);
    if (!Number.isNaN(d.getTime())) out.from = d;
  }
  const to = asString(req.query.to);
  if (to) {
    const d = new Date(to);
    if (!Number.isNaN(d.getTime())) {
      d.setHours(23, 59, 59, 999);
      out.to = d;
    }
  }

  const sort = asString(req.query.sort);
  if (sort && ALLOWED_SORTS.has(sort)) out.sort = sort as TransactionQuery['sort'];

  const order = asString(req.query.order);
  if (order === 'asc' || order === 'desc') out.order = order;

  const pageStr = asString(req.query.page);
  if (pageStr) {
    const n = parseInt(pageStr, 10);
    if (Number.isFinite(n) && n > 0) out.page = n;
  }
  const limitStr = asString(req.query.limit);
  if (limitStr) {
    const n = parseInt(limitStr, 10);
    if (Number.isFinite(n) && n > 0) out.limit = n;
  }
  return out;
}

// POST /api/v1/finance/transactions
export const createTransaction = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const error = validateTxInput(req.body);
    if (error) return res.status(400).json({ error });

    const { amount, date, description, category, type } = req.body;
    const tx = await finance.addTransaction({
      amount:      Number(amount),
      date:        date ? new Date(date) : new Date(),
      description: description?.trim(),
      category,
      type,
      userId,
    });

    const balance = await finance.getTotalBalance(userId);
    return res.status(201).json({ transaction: normalizeTransaction(tx), balance });
  } catch (error: any) {
    const message = typeof error?.message === 'string' ? error.message : 'Failed to create transaction';
    return res.status(400).json({ error: message });
  }
};

// PUT /api/v1/finance/transactions/:id
export const updateTransaction = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const error = validateTxInput(req.body, { partial: true });
    if (error) return res.status(400).json({ error });

    const { amount, date, description, category, type } = req.body;
    const patch: any = {};
    if (amount !== undefined)      patch.amount      = Number(amount);
    if (date !== undefined && date !== '') patch.date = new Date(date);
    if (description !== undefined) patch.description = String(description).trim();
    if (category !== undefined)    patch.category    = category;
    if (type !== undefined)        patch.type        = type;

    const updated = await finance.updateTransaction(String(req.params.id), userId, patch);
    if (!updated) return res.status(404).json({ error: 'Transaction not found or not owned by you' });

    const balance = await finance.getTotalBalance(userId);
    return res.json({ transaction: normalizeTransaction(updated), balance });
  } catch (error: any) {
    const message = typeof error?.message === 'string' ? error.message : 'Failed to update transaction';
    return res.status(400).json({ error: message });
  }
};

// GET /api/v1/finance/transactions
// Supports: ?q=&type=&category=&from=&to=&sort=&order=&page=&limit=
export const listTransactions = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const query = parseQuery(req);
    const result = await finance.queryTransactions(query);
    const balance = await finance.getTotalBalance(userId);

    return res.json({
      transactions: result.items.map(normalizeTransaction),
      balance,
      pagination: {
        page:  result.page,
        limit: result.limit,
        total: result.total,
        pages: result.pages,
      },
    });
  } catch (error: any) {
    const message = typeof error?.message === 'string' ? error.message : 'Failed to load transactions';
    return res.status(500).json({ error: message });
  }
};

// GET /api/v1/finance/transactions/export.csv
// Honors the same filters as listTransactions, ignores pagination.
export const exportTransactionsCsv = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const query = parseQuery(req);
    const rows = await finance.exportTransactions(query);

    const records = rows.map((tx: any) => {
      const t = normalizeTransaction(tx);
      return {
        Date:        new Date(t.date).toISOString().slice(0, 10),
        Type:        t.type,
        Category:    t.category,
        Description: t.description,
        // Signed amount makes the CSV directly usable in spreadsheets.
        Amount:      t.type === 'expense' ? -Math.abs(t.amount) : Math.abs(t.amount),
      };
    });

    // Always emit headers so an empty result still produces a valid CSV file.
    const parser = new CsvParser({ fields: ['Date', 'Type', 'Category', 'Description', 'Amount'] });
    const csv = records.length ? parser.parse(records) : 'Date,Type,Category,Description,Amount';

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="transactions-${Date.now()}.csv"`);
    return res.send(csv);
  } catch (error: any) {
    const message = typeof error?.message === 'string' ? error.message : 'Failed to export transactions';
    return res.status(500).json({ error: message });
  }
};

// DELETE /api/v1/finance/transactions/:id
export const deleteTransaction = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const id = String(req.params.id);
    const deleted = await finance.removeTransaction(id, userId);

    if (!deleted) {
      return res.status(404).json({ error: 'Transaction not found or not owned by you' });
    }

    const balance = await finance.getTotalBalance(userId);
    return res.json({ message: 'Transaction deleted', balance });
  } catch (error: any) {
    const message = typeof error?.message === 'string' ? error.message : 'Failed to delete transaction';
    return res.status(500).json({ error: message });
  }
};
