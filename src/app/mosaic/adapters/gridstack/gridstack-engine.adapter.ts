import { Injectable } from '@angular/core';
import { GridStack, GridStackNode } from 'gridstack';
import { MosaicGridOptions, MosaicTile } from '../../domain/mosaic.models';
import { GridEnginePort } from '../../ports/grid-engine.port';

/**
 * Adapter for the GridStack library.
 * It implements the GridEnginePort to map our domain to GridStack specifics.
 */
@Injectable()
export class GridstackEngineAdapter implements GridEnginePort {
  private gridEngine?: GridStack;

  init(container: HTMLElement, options: MosaicGridOptions, onLayoutChange: (tiles: Partial<MosaicTile>[]) => void): void {
    this.gridEngine = GridStack.init({
      column: options.columns,
      cellHeight: options.cellHeight,
      margin: options.margin,
      animate: options.animate,
      float: true,
      itemClass: 'mosaic-tile-item',
      draggable: { handle: '.tile-header' },
      resizable: { handles: 'se' },
    }, container);

    this.gridEngine.on('change', () => {
      const updatedTiles = this.syncLayout();
      onLayoutChange(updatedTiles);
    });
  }

  private syncLayout(): Partial<MosaicTile>[] {
    if (!this.gridEngine) return [];

    const items = this.gridEngine.getGridItems();
    return items.map(item => {
      const node = item.gridstackNode as GridStackNode;
      const el = item as HTMLElement; // Casting to access DOM element properties
      const id = el.getAttribute('data-mosaic-id');

      return {
        id: id ?? '',
        x: node.x ?? 0,
        y: node.y ?? 0,
        w: node.w ?? 1,
        h: node.h ?? 1,
      };
    });
  }

  destroy(): void {
    this.gridEngine?.destroy();
    this.gridEngine = undefined;
  }
}
