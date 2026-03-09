import { Component, ElementRef, input, viewChild, afterNextRender, OnDestroy, output, inject, effect, untracked, ChangeDetectionStrategy, signal } from '@angular/core';
import { MosaicTile, MosaicGridOptions } from '../../domain/mosaic.models';
import { GRID_ENGINE } from '../../ports/grid-engine.port';
import { GridstackEngineAdapter } from '../../adapters/grid/gridstack.grid';
import { BookmarkWidgetComponent } from '../widgets/bookmark/bookmark';

@Component({
  selector: 'app-grid',
  standalone: true,
  imports: [BookmarkWidgetComponent],
  templateUrl: './grid.component.html',
  styleUrl: './grid.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    { provide: GRID_ENGINE, useClass: GridstackEngineAdapter }
  ]
})
export class GridComponent implements OnDestroy {
  tiles = input.required<MosaicTile[]>();
  tilesChange = output<MosaicTile[]>();
  deleteTile = output<string>();

  protected selectedTile = signal<MosaicTile | null>(null);

  private gridEngine = inject(GRID_ENGINE);
  private gridContainer = viewChild<ElementRef<HTMLElement>>('gridContainer');
  private isUpdatingFromEngine = false;

  constructor() {
    afterNextRender(() => {
      this.initGrid();
    });

    effect(() => {
      this.tiles();
      untracked(() => {
        if (!this.isUpdatingFromEngine) {
          // New tiles might have been added to the DOM by Angular, tell Gridstack to adopt them
          setTimeout(() => this.gridEngine.refresh(), 0);
        }
      });
    });
  }

  private initGrid() {
    const el = this.gridContainer()?.nativeElement;
    if (!el) return;

    const options: MosaicGridOptions = {
      columns: 6,
      cellHeight: '200px',
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

  protected openSettings(tile: MosaicTile) {
    this.selectedTile.set(tile);
  }

  protected closeSettings() {
    this.selectedTile.set(null);
  }

  protected removeWidget() {
    const tile = this.selectedTile();
    if (tile) {
      this.gridEngine.removeWidget(tile.id);
      this.deleteTile.emit(tile.id);
      this.closeSettings();
    }
  }

  protected toggleBookmarkMode() {
    const tile = this.selectedTile();
    if (tile && tile.type === 'bookmark' && tile.configuration) {
      const newMode: 'grid' | 'list' = tile.configuration.displayMode === 'grid' ? 'list' : 'grid';
      const updatedTiles = this.tiles().map(t => 
        t.id === tile.id 
          ? { ...t, configuration: { ...t.configuration!, displayMode: newMode } }
          : t
      );
      this.tilesChange.emit(updatedTiles);
      // Update selected tile to reflect change in UI immediately
      this.selectedTile.set({ ...tile, configuration: { ...tile.configuration!, displayMode: newMode } });
    }
  }

  ngOnDestroy() {
    this.gridEngine.destroy();
  }
}
