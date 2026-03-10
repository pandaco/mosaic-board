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
      chrome.bookmarks.getSubTree(folderId, (nodes) => {
        if (!nodes || nodes.length === 0) {
          resolve([]);
          return;
        }
        const children = nodes[0].children || [];
        const items: BookmarkItem[] = children.map((child) => ({
          id: child.id,
          title: child.title || 'Root',
          type: child.url ? 'link' : 'folder',
          icon: child.url ? getFaviconUrl(child.url) : undefined,
          childrenCount: child.children ? child.children.length : undefined,
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
      title: node.title || 'Root',
      url: node.url,
      type: node.url ? 'link' : 'folder',
      childrenCount: node.children ? node.children.length : undefined,
    }));
  }
}
