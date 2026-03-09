import { InjectionToken } from '@angular/core';
import { BookmarkItem } from '../domain/mosaic.models';

/**
 * Port (Interface) for Bookmark operations.
 */
export interface BookmarksPort {
  /**
   * Retrieves the contents of a specific folder.
   */
  getFolderContents(folderId: string): Promise<BookmarkItem[]>;

  /**
   * Retrieves the bookmark tree (useful for selecting a root folder).
   */
  getTree(): Promise<BookmarkItem[]>;
}

/**
 * Angular Injection Token for the bookmarks service.
 */
export const BOOKMARKS_SERVICE = new InjectionToken<BookmarksPort>('BOOKMARKS_SERVICE');
