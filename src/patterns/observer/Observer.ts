export interface Observer {
  update(message: string, data?: any): void;
}