import { Component, signal } from '@angular/core';
import { GridComponent } from './mosaic/ui/grid/grid.component';
import { MosaicTile } from './mosaic/domain/mosaic.models';

@Component({
  imports: [GridComponent],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected title = 'Mosaic Board';

  // State is purely managed through our MosaicTile model
  protected tiles = signal<MosaicTile[]>([
    { id: '1', x: 0, y: 0, w: 4, h: 2, title: 'Ma première tuile', type: 'widget', content: 'Contenu 1' },
    { id: '2', x: 4, y: 0, w: 2, h: 2, title: 'Liens rapides', type: 'link', content: 'Contenu 2' },
    { id: '3', x: 0, y: 2, w: 2, h: 2, title: 'Image', type: 'image', content: 'Contenu 3' },
  ]);

  onTilesChange(updatedTiles: MosaicTile[]) {
    console.log('Nouveau layout Mosaic :', updatedTiles);
    this.tiles.set(updatedTiles);
  }
}
