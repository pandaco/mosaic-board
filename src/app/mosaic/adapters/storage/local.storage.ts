import { Injectable } from '@angular/core';
import { StoragePort } from '../../ports/storage.port';

/**
 * Adapter for window.localStorage.
 */
@Injectable()
export class LocalStorageAdapter implements StoragePort {
  async save<T>(key: string, data: T): Promise<void> {
    localStorage.setItem(key, JSON.stringify(data));
  }

  async load<T>(key: string): Promise<T | null> {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  }
}
