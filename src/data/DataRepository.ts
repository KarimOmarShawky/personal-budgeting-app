/**
 * DataRepository (Repository Pattern)
 * ----------------------------------
 * A tiny generic contract for persistence.
 *
 * Today: we implement repositories with in-memory arrays.
 * Tomorrow: we can swap implementations to SQL/NoSQL without changing controllers/services.
 */
export interface DataRepository<T extends { id: string }> {
  findAll(): Promise<T[]>;
  findById(id: string): Promise<T | null>;
  create(entity: T): Promise<T>;
  update(id: string, patch: Partial<T>): Promise<T | null>;
  delete(id: string): Promise<boolean>;
}

