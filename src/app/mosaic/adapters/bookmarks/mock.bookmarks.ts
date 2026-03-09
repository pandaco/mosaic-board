import { Injectable } from '@angular/core';
import { BookmarksPort } from '../../ports/bookmarks.port';
import { BookmarkItem } from '../../domain/mosaic.models';

@Injectable()
export class MockBookmarksAdapter implements BookmarksPort {
  private mockData: Record<string, BookmarkItem[]> = {
    'root': [
      { id: '1', title: 'Work', type: 'folder' },
      { id: '2', title: 'Social', type: 'folder' },
      { id: '3', title: 'Angular', url: 'https://angular.dev', type: 'link', icon: 'https://www.google.com/s2/favicons?sz=64&domain_url=angular.dev' },
    ],
    '1': [
      { id: '11', title: 'GitHub', url: 'https://github.com', type: 'link', icon: 'https://www.google.com/s2/favicons?sz=64&domain_url=github.com' },
      { id: '12', title: 'Jira', url: 'https://atlassian.com', type: 'link', icon: 'https://www.google.com/s2/favicons?sz=64&domain_url=atlassian.com' },
    ]
  };

  async getFolderContents(folderId: string): Promise<BookmarkItem[]> {
    return this.mockData[folderId] ?? this.mockData['root'];
  }

  async getTree(): Promise<BookmarkItem[]> {
    return this.mockData['root'];
  }
}
