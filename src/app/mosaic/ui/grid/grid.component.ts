import { Component, ElementRef, input, viewChild, afterNextRender, OnDestroy, output, inject, effect, untracked, ChangeDetectionStrategy } from '@angular/core';
import { MosaicTile, MosaicGridOptions } from '../../domain/mosaic.models';
import { GRID_ENGINE } from '../../ports/grid-engine.port';
import { GridstackEngineAdapter } from '../../adapters/gridstack/gridstack-engine.adapter';

@Component({
  selector: 'app-grid',
  standalone: true,
  templateUrl: './grid.component.html',
  styleUrl: './grid.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
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
  private isUpdatingFromEngine = false;

  constructor() {
    afterNextRender(() => {
      this.initGrid();
    });

    // Handle external updates to tiles (e.g. from storage)
    effect(() => {
      const tiles = this.tiles();
      untracked(() => {
        if (!this.isUpdatingFromEngine) {
          // If needed, we could implement a full refresh here, 
          // but for now the initial load from storage happens before/during init.
        }
      });
    });
  }

  private initGrid() {
    const el = this.gridContainer()?.nativeElement;
    if (!el) return;

    const options: MosaicGridOptions = {
      columns: 12,
      cellHeight: '100px',
      margin: 10,
      animate: true,
      placeholder: {
        enabled: true,
        className: 'grid-stack-placeholder'
      }
    };

    this.gridEngine.init(el, options, (updatedTiles) => {
      this.isUpdatingFromEngine = true;
      this.syncChanges(updatedTiles);
      this.isUpdatingFromEngine = false;
    });
  }

  private syncChanges(engineTiles: Partial<MosaicTile>[]) {
    const currentTiles = this.tiles();
    let hasChanged = false;

    const updatedTiles = currentTiles.map(tile => {
      const match = engineTiles.find(t => t.id === tile.id);
      if (match) {
        const changed = 
          tile.x !== match.x || 
          tile.y !== match.y || 
          tile.w !== match.w || 
          tile.h !== match.h;
        
        if (changed) {
          hasChanged = true;
          return {
            ...tile,
            x: match.x ?? tile.x,
            y: match.y ?? tile.y,
            w: match.w ?? tile.w,
            h: match.h ?? tile.h
          };
        }
      }
      return tile;
    });

    if (hasChanged) {
      this.tilesChange.emit(updatedTiles);
    }
  }

  ngOnDestroy() {
    this.gridEngine.destroy();
  }
}
