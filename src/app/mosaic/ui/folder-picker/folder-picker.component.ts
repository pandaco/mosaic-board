import { Component, inject, output, resource, signal, computed } from '@angular/core';
import { BOOKMARKS_SERVICE } from '../../ports/bookmarks.port';
import { BookmarkItem } from '../../domain/mosaic.models';

export interface FolderSelection {
  id: string;
  title: string;
}

interface FolderEntry {
  id: string;
  title: string;
}

@Component({
  selector: 'app-folder-picker',
  standalone: true,
  imports: [],
  template: `
    <div class="picker-overlay" (click)="cancelled.emit()" role="presentation">
      <div class="picker-modal" (click)="$event.stopPropagation()"
           role="dialog" aria-modal="true">

        <div class="picker-header">
          @if (folderStack().length > 0) {
            <button class="icon-btn" type="button" (click)="goBack()">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
              </svg>
            </button>
          }
          <span class="header-title">
            {{ folderStack().length === 0 ? 'Select a folder' : folderStack().at(-1)!.title }}
          </span>
          <button class="icon-btn" type="button" (click)="cancelled.emit()">✕</button>
        </div>

        <div class="picker-body">
          @if (itemsResource.isLoading()) {
            <div class="state-msg">Loading...</div>
          } @else if (itemsResource.error()) {
            <div class="state-msg error">Failed to load folders</div>
          } @else {
            @for (item of items(); track item.id) {
              <button class="item-row" [class.is-link]="item.type === 'link'"
                      type="button" [disabled]="item.type === 'link'"
                      (click)="item.type === 'folder' ? navigateInto(item) : null">
                @if (item.type === 'folder') {
                  <svg viewBox="0 0 24 24" fill="currentColor" class="item-icon folder">
                    <path d="M10,4H4C2.9,4,2.01,4.9,2.01,6L2,18c0,1.1,0.9,2,2,2h16c1.1,0,2-0.9,2-2V8c0-1.1-0.9-2-2-2h-8L10,4z"/>
                  </svg>
                } @else {
                  <svg viewBox="0 0 24 24" fill="currentColor" class="item-icon link">
                    <path d="M3.9,12c0-1.71,1.39-3.1,3.1-3.1h4V7H7c-2.76,0-5,2.24-5,5s2.24,5,5,5h4v-1.9H7C5.29,15.1,3.9,13.71,3.9,12z M8,13h8v-2H8V13z M17,7h-4v1.9h4c1.71,0,3.1,1.39,3.1,3.1s-1.39,3.1-3.1,3.1h-4V17h4c2.76,0,5-2.24,5-5S19.76,7,17,7z"/>
                  </svg>
                }
                <span class="item-name">{{ item.title || 'Root' }}</span>
                @if (item.type === 'folder') {
                  <svg viewBox="0 0 24 24" fill="currentColor" class="chevron">
                    <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
                  </svg>
                }
              </button>
            } @empty {
              <div class="state-msg">No items found</div>
            }
          }
        </div>

        <div class="picker-footer">
          <button class="use-btn" type="button"
                  [disabled]="folderStack().length === 0"
                  (click)="selectCurrentFolder()">
            @if (folderStack().length === 0) {
              Navigate into a folder to select it
            } @else {
              Use "{{ folderStack().at(-1)!.title }}"
            }
          </button>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .picker-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.4);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 3000;
      animation: fadeIn 0.15s ease-out;
    }

    .picker-modal {
      width: 360px;
      height: 420px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 20px 25px -5px rgba(0,0,0,0.15), 0 10px 10px -5px rgba(0,0,0,0.06);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      animation: slideUp 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .picker-header {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 0 8px 0 16px;
      height: 52px;
      border-bottom: 1px solid #f0f0f0;
      flex-shrink: 0;
    }

    .header-title {
      flex: 1;
      font-size: 0.95rem;
      font-weight: 600;
      color: #1d1d1f;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .icon-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border: none;
      border-radius: 6px;
      background: transparent;
      color: #86868b;
      cursor: pointer;
      flex-shrink: 0;
      font-size: 1rem;
      transition: background 0.15s, color 0.15s;

      svg { width: 18px; height: 18px; }
      &:hover { background: rgba(0,0,0,0.06); color: #1d1d1f; }
    }

    .picker-body {
      flex: 1;
      overflow-y: auto;
      padding: 6px;
    }

    .item-row {
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
      padding: 9px 12px;
      border: none;
      border-radius: 8px;
      background: transparent;
      font: inherit;
      color: #1d1d1f;
      cursor: pointer;
      text-align: left;
      transition: background 0.15s;

      &:hover:not([disabled]) { background: rgba(0,0,0,0.05); }
      &[disabled] { cursor: default; }

      &.is-link {
        opacity: 0.6;
        .item-name { font-weight: 400; color: #86868b; }
      }
    }

    .item-icon {
      width: 20px;
      height: 20px;
      flex-shrink: 0;
      &.folder { color: #86868b; }
      &.link { color: #c7c7cc; }
    }

    .item-name { flex: 1; font-size: 0.9rem; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .chevron { width: 18px; height: 18px; color: #c7c7cc; flex-shrink: 0; }

    .picker-footer {
      padding: 12px 16px;
      border-top: 1px solid #f0f0f0;
      flex-shrink: 0;
    }

    .use-btn {
      width: 100%;
      padding: 10px 16px;
      border: none;
      border-radius: 8px;
      background: #0071e3;
      color: white;
      font: inherit;
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;

      &:hover:not([disabled]) { background: #0077ed; }
      &[disabled] {
        background: #f0f0f0;
        color: #a1a1a6;
        cursor: default;
      }
    }

    .state-msg {
      padding: 24px;
      text-align: center;
      color: #86868b;
      font-size: 0.875rem;
      &.error { color: #e53e3e; }
    }

    @keyframes fadeIn {
      from { opacity: 0; } to { opacity: 1; }
    }
    @keyframes slideUp {
      from { opacity: 0; transform: translateY(12px) scale(0.97); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
  `]
})
export class FolderPickerComponent {
  cancelled = output<void>();
  folderSelected = output<FolderSelection>();

  private bookmarksService = inject(BOOKMARKS_SERVICE);
  protected folderStack = signal<FolderEntry[]>([]);

  private currentFolderId = computed(() => this.folderStack().at(-1)?.id ?? null);

  protected itemsResource = resource({
    params: () => this.currentFolderId(),
    loader: async ({ params: folderId }) => {
      const items: BookmarkItem[] = folderId
        ? await this.bookmarksService.getFolderContents(folderId)
        : await this.bookmarksService.getTree();
      return items;
    }
  });

  protected items = computed(() => this.itemsResource.value() ?? []);

  protected navigateInto(folder: FolderEntry) {
    const title = folder.title || 'Root';
    this.folderStack.update(s => [...s, { ...folder, title }]);
  }

  protected goBack() {
    this.folderStack.update(s => s.slice(0, -1));
  }

  protected selectCurrentFolder() {
    const current = this.folderStack().at(-1);
    if (current) this.folderSelected.emit(current);
  }
}
