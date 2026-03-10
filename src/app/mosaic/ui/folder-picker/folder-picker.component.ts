import { Component, inject, output, resource, signal, computed, ChangeDetectionStrategy } from '@angular/core';
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
  templateUrl: './folder-picker.component.html',
  styleUrl: './folder-picker.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
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
