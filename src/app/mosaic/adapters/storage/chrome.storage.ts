import { Injectable } from '@angular/core';
import { StoragePort } from '../../ports/storage.port';

/**
 * Adapter for chrome.storage.local.
 * Used when running as a Chrome extension.
 */
@Injectable()
export class ChromeStorageAdapter implements StoragePort {
  async save<T>(key: string, data: T): Promise<void> {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [key]: data }, () => {
        if (chrome.runtime.lastError) {
          console.error('Error saving to chrome storage:', chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  }

  async load<T>(key: string): Promise<T | null> {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get([key], (result) => {
        if (chrome.runtime.lastError) {
          console.error('Error loading from chrome storage:', chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
        } else {
          const value = result[key] as T | undefined;
          resolve(value ?? null);
        }
      });
    });
  }
}
