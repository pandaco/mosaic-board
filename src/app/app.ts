import { Component, signal, inject, resource, linkedSignal, ChangeDetectionStrategy } from '@angular/core';
import { GridComponent } from './mosaic/ui/grid/grid.component';
import { MosaicWidget } from './mosaic/domain/mosaic.models';
import { STORAGE_SERVICE } from './mosaic/ports/storage.port';
import { APP_VERSION } from './version';

const STORAGE_KEY = 'mosaic_layout';

const DEFAULT_WIDGETS: MosaicWidget[] = [
  { id: '1', x: 0, y: 0, w: 2, h: 1, title: 'Ma première tuile', type: 'widget', content: 'Contenu 1' },
  { id: '2', x: 2, y: 0, w: 2, h: 1, title: 'Liens rapides', type: 'link', content: 'Contenu 2' },
  { id: '3', x: 0, y: 1, w: 2, h: 1, title: 'Image', type: 'image', content: 'Contenu 3' },
];

@Component({
  imports: [GridComponent],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(window:keydown.escape)': 'closeAddModal()'
  }
})
export class App {
  protected title = 'Mosaic Board';
  protected version = APP_VERSION;
  private storage = inject(STORAGE_SERVICE);

  protected isAddModalOpen = signal(false);

  protected layoutResource = resource({
    loader: () => this.storage.load<MosaicWidget[]>(STORAGE_KEY),
  });

  protected widgets = linkedSignal<MosaicWidget[] | null, MosaicWidget[]>({
    source: () => this.layoutResource.value(),
    computation: (newLayout) => newLayout ?? DEFAULT_WIDGETS,
  });

  onWidgetsChange(updatedWidgets: MosaicWidget[]) {
    if (this.layoutResource.isLoading() || updatedWidgets.length === 0) {
      return;
    }

    this.widgets.set(updatedWidgets);
    this.storage.save(STORAGE_KEY, updatedWidgets)
      .catch(error => console.error('Failed to save layout:', error));
  }

  onDeleteWidget(id: string) {
    const updatedWidgets = this.widgets().filter(w => w.id !== id);
    this.widgets.set(updatedWidgets);
    this.storage.save(STORAGE_KEY, updatedWidgets)
      .catch(error => console.error('Failed to save layout after deletion:', error));
  }

  protected openAddModal() {
    this.isAddModalOpen.set(true);
  }

  protected closeAddModal() {
    this.isAddModalOpen.set(false);
  }

  protected addWidget(type: 'widget' | 'link' | 'image' | 'bookmark') {
    const newWidget: MosaicWidget = type === 'bookmark'
      ? {
          id: crypto.randomUUID(), x: 0, y: 0, w: 2, h: 1,
          title: 'Bookmarks',
          type: 'bookmark',
          configuration: { rootFolderId: '1', displayMode: 'grid', useGoogleFavicons: false, showItemCount: true }
        }
      : {
          id: crypto.randomUUID(), x: 0, y: 0, w: 2, h: 1,
          title: type === 'link' ? 'Bookmark' : 'New Widget',
          type,
          content: type === 'link' ? 'https://google.com' : undefined
        };

    const updatedWidgets = [newWidget, ...this.widgets()];
    this.widgets.set(updatedWidgets);
    this.storage.save(STORAGE_KEY, updatedWidgets)
      .catch(error => console.error('Failed to save layout after addition:', error));

    this.closeAddModal();
  }
}
