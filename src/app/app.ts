import { Component, signal, inject, resource, linkedSignal, ChangeDetectionStrategy } from '@angular/core';
import { GridComponent } from './mosaic/ui/grid/grid.component';
import { MosaicTile } from './mosaic/domain/mosaic.models';
import { STORAGE_SERVICE } from './mosaic/ports/storage.port';

const STORAGE_KEY = 'mosaic_layout';

const DEFAULT_TILES: MosaicTile[] = [
  { id: '1', x: 0, y: 0, w: 4, h: 2, title: 'Ma première tuile', type: 'widget', content: 'Contenu 1' },
  { id: '2', x: 4, y: 0, w: 2, h: 2, title: 'Liens rapides', type: 'link', content: 'Contenu 2' },
  { id: '3', x: 0, y: 2, w: 2, h: 2, title: 'Image', type: 'image', content: 'Contenu 3' },
];

@Component({
  imports: [GridComponent],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected title = 'Mosaic Board';
  private storage = inject(STORAGE_SERVICE);

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
}
