import { Component, input, inject, resource, signal, computed } from '@angular/core';
import { BookmarkWidget, BookmarkItem } from '../../../domain/mosaic.models';
import { BOOKMARKS_SERVICE } from '../../../ports/bookmarks.port';

@Component({
  selector: 'app-bookmark-widget',
  standalone: true,
  imports: [],
  template: `
    <div class="bookmark-widget-container" [class.list-mode]="config().displayMode === 'list'">
      @if (bookmarkResource.isLoading()) {
        <div class="loading-state">Loading bookmarks...</div>
      } @else if (bookmarkResource.error()) {
        <div class="error-state">Failed to load bookmarks</div>
      } @else {
        <div class="bookmark-grid">
          @for (item of bookmarkResource.value() ?? []; track item.id) {
            <button class="bookmark-item" [class.folder]="item.type === 'folder'"
                    type="button" (click)="onItemClick(item)">
              <div class="item-icon-wrapper">
                @if (item.type === 'folder') {
                  <svg viewBox="0 0 24 24" fill="currentColor" class="folder-icon">
                    <path d="M10,4H4C2.9,4,2.01,4.9,2.01,6L2,18c0,1.1,0.9,2,2,2h16c1.1,0,2-0.9,2-2V8c0-1.1-0.9-2-2-2h-8L10,4z"/>
                  </svg>
                } @else {
                  <img [src]="item.icon || 'favicon.ico'" alt="" class="favicon" (error)="handleIconError($event)" />
                }
              </div>
              <span class="item-title" [title]="item.title">{{ item.title }}</span>
            </button>
          } @empty {
            <div class="empty-state">No bookmarks found in this folder</div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; width: 100%; overflow: auto; }
    .bookmark-widget-container { padding: 8px; }

    .bookmark-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
      gap: 12px;
    }

    .list-mode .bookmark-grid {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .bookmark-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      padding: 8px;
      border-radius: 8px;
      cursor: pointer;
      transition: background 0.2s;
      text-align: center;
      /* reset button defaults */
      border: none;
      background: transparent;
      font: inherit;
      color: inherit;
    }

    .list-mode .bookmark-item {
      flex-direction: row;
      text-align: left;
      padding: 6px 10px;
    }

    .bookmark-item:hover { background: rgba(0, 0, 0, 0.05); }

    .item-icon-wrapper {
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .list-mode .item-icon-wrapper {
      width: 20px;
      height: 20px;
    }

    .folder-icon { color: #86868b; }
    .favicon { width: 24px; height: 24px; border-radius: 4px; }
    .list-mode .favicon { width: 16px; height: 16px; }

    .item-title {
      font-size: 0.75rem;
      font-weight: 500;
      color: #1d1d1f;
      width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .list-mode .item-title { font-size: 0.85rem; }

    .loading-state, .error-state, .empty-state {
      padding: 20px;
      text-align: center;
      color: #86868b;
      font-size: 0.85rem;
    }
  `]
})
export class BookmarkWidgetComponent {
  widget = input.required<BookmarkWidget>();
  config = computed(() => this.widget().configuration);

  private bookmarksService = inject(BOOKMARKS_SERVICE);
  private currentFolderId = signal<string | undefined>(undefined);

  protected bookmarkResource = resource({
    loader: () => {
      const folderId = this.currentFolderId() ?? this.config().rootFolderId ?? '1';
      return this.bookmarksService.getFolderContents(folderId);
    }
  });

  protected onItemClick(item: BookmarkItem) {
    if (item.type === 'folder') {
      this.currentFolderId.set(item.id);
    } else if (item.url) {
      window.open(item.url, '_blank');
    }
  }

  protected handleIconError(event: Event) {
    const img = event.target as HTMLImageElement;
    if (!img.src.endsWith('favicon.ico')) {
      img.src = 'favicon.ico';
    }
  }
}
