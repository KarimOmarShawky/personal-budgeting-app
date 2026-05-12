import { ExportStrategy } from './ExportStrategy';
import { CategoryDistributionReport } from '../../services/ReportGenerator';

export interface ChartData {
  labels: string[];
  datasets: {
    data: number[];
    backgroundColor: string[];
    hoverBackgroundColor: string[];
  }[];
}

export class ChartDataStrategy implements ExportStrategy<ChartData> {
  async export(data: CategoryDistributionReport): Promise<ChartData> {
    const entries = Object.entries(data.totals).filter(([, amount]) => amount > 0);
    const labels = entries.map(([category]) => category);
    const values = entries.map(([, amount]) => amount);

    // Simple colors, can be customized
    const colors = [
      '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF'
    ];

    return {
      labels,
      datasets: [{
        data: values,
        backgroundColor: colors.slice(0, labels.length),
        hoverBackgroundColor: colors.slice(0, labels.length),
      }],
    };
  }
}