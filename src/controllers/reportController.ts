import { Request, Response } from 'express';
import { FinanceManager } from '../services/FinanceManager';
import {
  CategoryDistributionReport,
  CategoryDistributionStrategy,
  MonthlySummaryReport,
  MonthlySummaryStrategy,
  ReportGenerator,
} from '../services/ReportGenerator';
import { PdfExport } from '../patterns/strategy/PdfExport';
import { CsvExport } from '../patterns/strategy/CsvExport';
import { ChartDataStrategy } from '../patterns/strategy/ChartDataStrategy';

const finance = FinanceManager.getInstance();

function parseParams(req: Request) {
  return {
    year:       Number(req.query.year  ?? new Date().getFullYear()),
    month1To12: Number(req.query.month ?? new Date().getMonth() + 1),
    type:       ((req.query.type as string) ?? 'expense') as 'income' | 'expense',
    userId:     req.user!.userId,
  };
}

export const monthlySummary = async (req: Request, res: Response) => {
  try {
    const { year, month1To12, userId } = parseParams(req);
    const report = await finance.getMonthlySummary(year, month1To12, userId);
    return res.json({ report });
  } catch (error: any) {
    return res.status(400).json({ error: error?.message ?? 'Failed to generate report' });
  }
};

export const categoryWise = async (req: Request, res: Response) => {
  try {
    const { year, month1To12, type, userId } = parseParams(req);
    const totals = await finance.getCategoryTotals(year, month1To12, type, userId);
    const month  = `${year}-${String(month1To12).padStart(2, '0')}`;
    const report: CategoryDistributionReport = { month, type, totals };
    return res.json({ report });
  } catch (error: any) {
    return res.status(400).json({ error: error?.message ?? 'Failed to generate report' });
  }
};

export const exportPdf = async (req: Request, res: Response) => {
  try {
    const { year, month1To12, type, userId } = parseParams(req);
    const totals = await finance.getCategoryTotals(year, month1To12, type, userId);
    const month  = `${year}-${String(month1To12).padStart(2, '0')}`;
    const report: CategoryDistributionReport = { month, type, totals };

    const pdfExport = new PdfExport();
    const pdfBuffer = await pdfExport.export(report);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=report-${year}-${month1To12}.pdf`);
    return res.send(pdfBuffer);
  } catch (error: any) {
    return res.status(400).json({ error: error?.message ?? 'Failed to export PDF' });
  }
};

export const exportCsv = async (req: Request, res: Response) => {
  try {
    const { year, month1To12, type, userId } = parseParams(req);
    const totals = await finance.getCategoryTotals(year, month1To12, type, userId);
    const month  = `${year}-${String(month1To12).padStart(2, '0')}`;
    const report: CategoryDistributionReport = { month, type, totals };

    const csvExport = new CsvExport();
    const csvString = await csvExport.export(report);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=report-${year}-${month1To12}.csv`);
    return res.send(csvString);
  } catch (error: any) {
    return res.status(400).json({ error: error?.message ?? 'Failed to export CSV' });
  }
};

export const chartData = async (req: Request, res: Response) => {
  try {
    const { year, month1To12, type, userId } = parseParams(req);
    const totals = await finance.getCategoryTotals(year, month1To12, type, userId);
    const month  = `${year}-${String(month1To12).padStart(2, '0')}`;
    const report: CategoryDistributionReport = { month, type, totals };

    const chartStrategy = new ChartDataStrategy();
    const data = await chartStrategy.export(report);

    return res.json({ chartData: data });
  } catch (error: any) {
    return res.status(400).json({ error: error?.message ?? 'Failed to generate chart data' });
  }
};
