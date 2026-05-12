import { Router } from 'express';
import { listBudgets, createBudget, deleteBudget } from '../controllers/budgetController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/',    requireAuth, listBudgets);
router.post('/',   requireAuth, createBudget);
router.delete('/:id', requireAuth, deleteBudget);

export default router;
