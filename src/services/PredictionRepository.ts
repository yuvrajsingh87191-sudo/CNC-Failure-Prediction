import { PredictionRecord } from '../types/domain';

export interface IPredictionRepository {
  add(record: PredictionRecord): void;
  findAll(): PredictionRecord[];
  count(): number;
  clear(): void;
}

const STORAGE_KEY = 'cnc_failure_predictor_history_v1';

/**
 * Mirrors PredictionRepository.java with localStorage persistence for web demo.
 * Returns newest-first defensive copies so callers cannot mutate stored history.
 * Swappable with a JDBC/REST backend repository without modifying service or UI layers.
 */
export class LocalStoragePredictionRepository implements IPredictionRepository {
  private records: PredictionRecord[] = [];

  constructor() {
    this.records = this.loadFromStorage();
  }

  private loadFromStorage(): PredictionRecord[] {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed;
    } catch {
      return [];
    }
  }

  private persist(): void {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.records));
    } catch {
      // Gracefully keep in-memory copy if storage quota is unavailable
    }
  }

  public add(record: PredictionRecord): void {
    this.records.push(record);
    this.persist();
  }

  /**
   * Returns records newest-first as a defensive copy (matching PredictionRepository.findAll).
   */
  public findAll(): PredictionRecord[] {
    return [...this.records].reverse();
  }

  public count(): number {
    return this.records.length;
  }

  public clear(): void {
    this.records = [];
    this.persist();
  }
}
