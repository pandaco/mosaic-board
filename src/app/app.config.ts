import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter, withHashLocation } from '@angular/router';
import { appRoutes } from './app.routes';
import { STORAGE_SERVICE } from './mosaic/ports/storage.port';
import { BOOKMARKS_SERVICE } from './mosaic/ports/bookmarks.port';
import { ChromeStorageAdapter } from './mosaic/adapters/storage/chrome.storage';
import { LocalStorageAdapter } from './mosaic/adapters/storage/local.storage';
import { ChromeBookmarksAdapter } from './mosaic/adapters/bookmarks/chrome.bookmarks';
import { MockBookmarksAdapter } from './mosaic/adapters/bookmarks/mock.bookmarks';

/**
 * Determines if the app is running as a Chrome extension.
 */
function isChromeExtension(): boolean {
  return typeof chrome !== 'undefined' && !!chrome.runtime && !!chrome.runtime.id;
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideBrowserGlobalErrorListeners(),
    provideRouter(appRoutes, withHashLocation()),
    {
      provide: STORAGE_SERVICE,
      useClass: isChromeExtension() ? ChromeStorageAdapter : LocalStorageAdapter,
    },
    {
      provide: BOOKMARKS_SERVICE,
      useClass: isChromeExtension() ? ChromeBookmarksAdapter : MockBookmarksAdapter,
    },
  ],
};
