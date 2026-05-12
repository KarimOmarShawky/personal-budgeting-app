import { Observer } from './Observer';

export abstract class Subject {
  private observers: Observer[] = [];

  attach(observer: Observer): void {
    this.observers.push(observer);
  }

  detach(observer: Observer): void {
    this.observers = this.observers.filter(obs => obs !== observer);
  }

  protected notify(message: string, data?: any): void {
    for (const observer of this.observers) {
      observer.update(message, data);
    }
  }
}