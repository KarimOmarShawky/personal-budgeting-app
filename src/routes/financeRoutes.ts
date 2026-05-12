import { Router } from 'express';
import {
  createTransaction,
  listTransactions,
  updateTransaction,
  deleteTransaction,
  exportTransactionsCsv,
} from '../controllers/financeController';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Order matters: place the static "export.csv" route before the "/:id" routes
// so Express doesn't try to interpret "export.csv" as an id.
router.get('/transactions/export.csv', requireAuth, exportTransactionsCsv);

router.get('/transactions',         requireAuth, listTransactions);
router.post('/transactions',        requireAuth, createTransaction);
router.put('/transactions/:id',     requireAuth, updateTransaction);
router.delete('/transactions/:id',  requireAuth, deleteTransaction);

export default router;
