import { Router } from 'express';
import { categoryWise, monthlySummary, exportPdf, exportCsv, chartData } from '../controllers/reportController';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.get('/summary', requireAuth, monthlySummary);
router.get('/category-wise', requireAuth, categoryWise);
router.get('/export/pdf', requireAuth, exportPdf);
router.get('/export/csv', requireAuth, exportCsv);
router.get('/chart-data', requireAuth, chartData);

export default router;

