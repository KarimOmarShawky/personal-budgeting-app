import PDFDocument from 'pdfkit';
import { ExportStrategy } from './ExportStrategy';
import { CategoryDistributionReport } from '../../services/ReportGenerator';

export class PdfExport implements ExportStrategy<Buffer> {
  async export(data: CategoryDistributionReport): Promise<Buffer> {
    return new Promise((resolve) => {
      const doc = new PDFDocument();
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });

      // Title
      doc.fontSize(20).text(`Expense Report - ${data.month}`, { align: 'center' });
      doc.moveDown();

      // Table header
      doc.fontSize(14).text('Category', 50, doc.y);
      doc.text('Amount', 300, doc.y);
      doc.moveDown();

      // Data rows
      Object.entries(data.totals).forEach(([category, amount]) => {
        if (amount > 0) {
          doc.fontSize(12).text(category, 50, doc.y);
          doc.text(`$${amount.toFixed(2)}`, 300, doc.y);
          doc.moveDown();
        }
      });

      doc.end();
    });
  }
}