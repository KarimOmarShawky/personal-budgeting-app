export interface ExportStrategy<T> {
  export(data: any): Promise<T>;
}