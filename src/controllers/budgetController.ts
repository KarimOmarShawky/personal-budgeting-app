import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { BudgetModel } from '../models/Budget';
import { TransactionRepo } from '../data/TransactionRepo';

const transactionRepo = TransactionRepo.getInstance();

/** Compute how much was spent in a given month for a user + category */
async function computeSpent(userId: string, category: string, month: string): Promise<number> {
  const [yearStr, monthStr] = month.split('-');
  const year   = Number(yearStr);
  const mon    = Number(monthStr);
  const start  = new Date(year, mon - 1, 1, 0, 0, 0, 0);
  const end    = new Date(year, mon,     1, 0, 0, 0, 0);

  const txs = await transactionRepo.findByUserId(userId);
  let spent = 0;
  for (const tx of txs) {
    if (tx.type !== 'expense') continue;
    if (tx.category !== category) continue;
    const txDate = tx.dateTime ?? tx.createdAt;
    if (!txDate || txDate < start || txDate >= end) continue;
    spent += tx.amount;
  }
  return spent;
}

function budgetStatus(spent: number, limit: number, threshold: number): string {
  const pct = (spent / limit) * 100;
  if (spent >= limit)       return 'Exceeded';
  if (pct >= threshold)     return 'Near Limit';
  return 'On Track';
}

// GET /api/v1/budgets?month=YYYY-MM
export const listBudgets = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const month  = (req.query.month as string) ?? currentMonth();

    const budgets = await BudgetModel.find({ userId: new mongoose.Types.ObjectId(userId), month });

    const enriched = await Promise.all(
      budgets.map(async (b) => {
        const spent  = await computeSpent(userId, b.category, b.month);
        const status = budgetStatus(spent, b.limitAmount, b.alertThreshold);
        return {
          id:             b._id,
          category:       b.category,
          month:          b.month,
          limitAmount:    b.limitAmount,
          alertThreshold: b.alertThreshold,
          spent,
          status,
          pct: Math.min(100, Math.round((spent / b.limitAmount) * 100)),
        };
      })
    );

    return res.json({ budgets: enriched });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message ?? 'Failed to load budgets' });
  }
};

// POST /api/v1/budgets
export const createBudget = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { category, month, limitAmount, alertThreshold } = req.body;

    if (!category || !month || !limitAmount) {
      return res.status(400).json({ error: 'category, month, and limitAmount are required' });
    }
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ error: 'month must be YYYY-MM' });
    }

    // Upsert: update existing or create new
    const budget = await BudgetModel.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(userId), category, month },
      { limitAmount: Number(limitAmount), alertThreshold: Number(alertThreshold ?? 80) },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const spent  = await computeSpent(userId, budget.category, budget.month);
    const status = budgetStatus(spent, budget.limitAmount, budget.alertThreshold);

    return res.status(201).json({
      budget: {
        id:             budget._id,
        category:       budget.category,
        month:          budget.month,
        limitAmount:    budget.limitAmount,
        alertThreshold: budget.alertThreshold,
        spent,
        status,
        pct: Math.min(100, Math.round((spent / budget.limitAmount) * 100)),
      },
    });
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'Budget for that category/month already exists' });
    }
    return res.status(400).json({ error: error?.message ?? 'Failed to create budget' });
  }
};

// DELETE /api/v1/budgets/:id
export const deleteBudget = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const id = String(req.params.id);

    const result = await BudgetModel.findOneAndDelete({
      _id:    new mongoose.Types.ObjectId(id),
      userId: new mongoose.Types.ObjectId(userId),
    });

    if (!result) return res.status(404).json({ error: 'Budget not found or not owned by you' });
    return res.json({ message: 'Budget deleted' });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message ?? 'Failed to delete budget' });
  }
};

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}
