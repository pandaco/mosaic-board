import { Component, ElementRef, input, viewChild, afterNextRender, OnDestroy, output, inject } from '@angular/core';
import { MosaicTile, MosaicGridOptions } from '../../domain/mosaic.models';
import { GRID_ENGINE } from '../../ports/grid-engine.port';
import { GridstackEngineAdapter } from '../../adapters/gridstack/gridstack-engine.adapter';

@Component({
  selector: 'app-grid',
  standalone: true,
  templateUrl: './grid.component.html',
  styleUrl: './grid.component.scss',
  providers: [
    { provide: GRID_ENGINE, useClass: GridstackEngineAdapter }
  ]
})
export class GridComponent implements OnDestroy {
  /**
   * Input property for the tiles to display.
   */
  tiles = input.required<MosaicTile[]>();

  /**
   * Event emitted when the layout changes.
   */
  tilesChange = output<MosaicTile[]>();

  private gridEngine = inject(GRID_ENGINE);
  private gridContainer = viewChild<ElementRef<HTMLElement>>('gridContainer');

  constructor() {
    afterNextRender(() => {
      this.initGrid();
    });
  }

  private initGrid() {
    const el = this.gridContainer()?.nativeElement;
    if (!el) return;

    const options: MosaicGridOptions = {
      columns: 12,
      cellHeight: '100px',
      margin: 10,
      animate: true
    };

    this.gridEngine.init(el, options, (updatedTiles) => {
      this.syncChanges(updatedTiles);
    });
  }

  private syncChanges(engineTiles: Partial<MosaicTile>[]) {
    const updatedTiles = this.tiles().map(tile => {
      const match = engineTiles.find(t => t.id === tile.id);
      if (match) {
        return {
          ...tile,
          x: match.x ?? tile.x,
          y: match.y ?? tile.y,
          w: match.w ?? tile.w,
          h: match.h ?? tile.h
        };
      }
      return tile;
    });

    this.tilesChange.emit(updatedTiles);
  }

  ngOnDestroy() {
    this.gridEngine.destroy();
  }
}
