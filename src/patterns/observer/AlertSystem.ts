import { Observer } from './Observer';
import { Category } from '../../types';

export class AlertSystem implements Observer {
  private alerts: string[] = [];

  update(message: string, data?: any): void {
    const alertMessage = `[ALERT] ${new Date().toISOString()}: ${message}`;
    this.alerts.push(alertMessage);
    console.log(alertMessage);

    // In a real app, this could send email, push notification, etc.
    // For now, just log and store.
  }

  getAlerts(): string[] {
    return [...this.alerts];
  }

  clearAlerts(): void {
    this.alerts = [];
  }
}