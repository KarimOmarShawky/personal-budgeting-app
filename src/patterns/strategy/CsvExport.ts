import { Parser } from 'json2csv';
import { ExportStrategy } from './ExportStrategy';
import { CategoryDistributionReport } from '../../services/ReportGenerator';

export class CsvExport implements ExportStrategy<string> {
  async export(data: CategoryDistributionReport): Promise<string> {
    const fields = ['Category', 'Amount'];
    const opts = { fields };

    const rows = Object.entries(data.totals)
      .filter(([, amount]) => amount > 0)
      .map(([category, amount]) => ({
        Category: category,
        Amount: amount,
      }));

    const parser = new Parser(opts);
    return parser.parse(rows);
  }
}