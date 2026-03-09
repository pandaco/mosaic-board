import { Component, signal, inject, resource, linkedSignal, ChangeDetectionStrategy } from '@angular/core';
import { GridComponent } from './mosaic/ui/grid/grid.component';
import { MosaicTile } from './mosaic/domain/mosaic.models';
import { STORAGE_SERVICE } from './mosaic/ports/storage.port';

const STORAGE_KEY = 'mosaic_layout';

const DEFAULT_TILES: MosaicTile[] = [
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
  private storage = inject(STORAGE_SERVICE);

  protected isAddModalOpen = signal(false);

  protected layoutResource = resource({
    loader: () => this.storage.load<MosaicTile[]>(STORAGE_KEY),
  });

  protected tiles = linkedSignal<MosaicTile[] | null, MosaicTile[]>({
    source: () => this.layoutResource.value(),
    computation: (newLayout) => newLayout ?? DEFAULT_TILES,
  });

  onTilesChange(updatedTiles: MosaicTile[]) {
    if (this.layoutResource.isLoading() || updatedTiles.length === 0) {
      return;
    }

    this.tiles.set(updatedTiles);
    this.storage.save(STORAGE_KEY, updatedTiles)
      .catch(error => console.error('Failed to save layout:', error));
  }

  onDeleteTile(id: string) {
    const updatedTiles = this.tiles().filter(t => t.id !== id);
    this.tiles.set(updatedTiles);
    this.storage.save(STORAGE_KEY, updatedTiles)
      .catch(error => console.error('Failed to save layout after deletion:', error));
  }

  protected openAddModal() {
    this.isAddModalOpen.set(true);
  }

  protected closeAddModal() {
    this.isAddModalOpen.set(false);
  }

  protected addWidget(type: 'widget' | 'link' | 'image' | 'bookmark') {
    const newWidget: MosaicTile = {
      id: crypto.randomUUID(),
      x: 0,
      y: 0,
      w: 2,
      h: 1,
      title: type === 'bookmark' ? 'Bookmarks' : (type === 'link' ? 'Bookmark' : 'New Widget'),
      type: type,
      content: type === 'link' ? 'https://google.com' : (type === 'bookmark' ? undefined : 'New Content'),
      configuration: type === 'bookmark' ? {
        rootFolderId: '1',
        displayMode: 'grid'
      } : undefined
    };

    const updatedTiles = [newWidget, ...this.tiles()];
    this.tiles.set(updatedTiles);
    this.storage.save(STORAGE_KEY, updatedTiles)
      .catch(error => console.error('Failed to save layout after addition:', error));
    
    this.closeAddModal();
  }
}
