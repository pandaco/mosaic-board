import { Injectable } from '@angular/core';
import { StoragePort } from '../../ports/storage.port';

/**
 * Adapter for window.localStorage.
 */
@Injectable()
export class LocalStorageAdapter implements StoragePort {
  async save<T>(key: string, data: T): Promise<void> {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving to local storage:', error);
    }
  }

  async load<T>(key: string): Promise<T | null> {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error loading from local storage:', error);
      return null;
    }
  }
}
