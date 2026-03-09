import { Injectable } from '@angular/core';
import { BookmarksPort } from '../../ports/bookmarks.port';
import { BookmarkItem } from '../../domain/mosaic.models';

function getFaviconUrl(url: string): string | undefined {
  try {
    const { hostname } = new URL(url);
    return `https://www.google.com/s2/favicons?sz=64&domain_url=${hostname}`;
  } catch {
    return undefined;
  }
}

@Injectable()
export class ChromeBookmarksAdapter implements BookmarksPort {
  async getFolderContents(folderId: string): Promise<BookmarkItem[]> {
    return new Promise((resolve) => {
      chrome.bookmarks.getChildren(folderId, (children) => {
        const items: BookmarkItem[] = children.map((child) => ({
          id: child.id,
          title: child.title,
          url: child.url,
          type: child.url ? 'link' : 'folder',
          icon: child.url ? getFaviconUrl(child.url) : undefined,
        }));
        resolve(items);
      });
    });
  }

  async getTree(): Promise<BookmarkItem[]> {
    return new Promise((resolve) => {
      chrome.bookmarks.getTree((nodes) => {
        const items = this.mapNodes(nodes);
        resolve(items);
      });
    });
  }

  private mapNodes(nodes: chrome.bookmarks.BookmarkTreeNode[]): BookmarkItem[] {
    return nodes.map((node) => ({
      id: node.id,
      title: node.title,
      url: node.url,
      type: node.url ? 'link' : 'folder',
      // Recursively map if needed, but for root selection we might just want top level
    }));
  }
}
