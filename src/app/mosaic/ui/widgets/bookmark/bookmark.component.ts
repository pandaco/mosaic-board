import { Component, input, inject, resource, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { BookmarkWidget, BookmarkItem } from '../../../domain/mosaic.models';
import { BOOKMARKS_SERVICE } from '../../../ports/bookmarks.port';

interface FolderEntry {
  id: string;
  title: string;
}

@Component({
  selector: 'app-bookmark-widget',
  standalone: true,
  imports: [NgOptimizedImage],
  templateUrl: './bookmark.component.html',
  styleUrl: './bookmark.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BookmarkWidgetComponent {
  widget = input.required<BookmarkWidget>();
  config = computed(() => this.widget().configuration);

  private bookmarksService = inject(BOOKMARKS_SERVICE);
  protected folderStack = signal<FolderEntry[]>([]);

  private currentFolderId = computed(() =>
    this.folderStack().at(-1)?.id ?? this.config().rootFolderId ?? '1'
  );

  protected bookmarkResource = resource({
    params: () => this.currentFolderId(),
    loader: ({ params: folderId }) => this.bookmarksService.getFolderContents(folderId)
  });

  protected onItemClick(item: BookmarkItem) {
    if (item.type === 'folder') {
      this.folderStack.update(stack => [...stack, { id: item.id, title: item.title }]);
    } else if (item.url) {
      window.open(item.url, '_blank');
    }
  }

  protected goBack() {
    this.folderStack.update(stack => stack.slice(0, -1));
  }

  protected handleIconError(event: Event) {
    // Hide the broken image; the template's @else branch (link SVG) is the canonical fallback,
    // but NgOptimizedImage renders a real <img> so we hide it on load failure instead.
    (event.target as HTMLImageElement).style.display = 'none';
  }
}
