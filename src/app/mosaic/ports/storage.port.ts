import { InjectionToken } from '@angular/core';

/**
 * Port (Interface) for data persistence.
 */
export interface StoragePort {
  /**
   * Saves data associated with a key.
   */
  save<T>(key: string, data: T): Promise<void>;

  /**
   * Retrieves data associated with a key.
   */
  load<T>(key: string): Promise<T | null>;
}

/**
 * Angular Injection Token for the storage service.
 */
export const STORAGE_SERVICE = new InjectionToken<StoragePort>('STORAGE_SERVICE');
