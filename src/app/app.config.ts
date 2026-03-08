import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { appRoutes } from './app.routes';
import { STORAGE_SERVICE } from './mosaic/ports/storage.port';
import { ChromeStorageAdapter } from './mosaic/adapters/storage/chrome-storage.adapter';
import { LocalStorageAdapter } from './mosaic/adapters/storage/local-storage.adapter';

/**
 * Determines if the app is running as a Chrome extension.
 */
function isChromeExtension(): boolean {
  return typeof chrome !== 'undefined' && !!chrome.storage && !!chrome.storage.local;
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideBrowserGlobalErrorListeners(),
    provideRouter(appRoutes),
    {
      provide: STORAGE_SERVICE,
      useClass: isChromeExtension() ? ChromeStorageAdapter : LocalStorageAdapter,
    },
  ],
};
