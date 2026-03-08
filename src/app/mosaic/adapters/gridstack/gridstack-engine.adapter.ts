import { Injectable } from '@angular/core';
import { GridStack, GridStackNode, GridStackOptions } from 'gridstack';
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
    const gridStackOptions: GridStackOptions = {
      column: options.columns,
      cellHeight: options.cellHeight,
      margin: options.margin,
      animate: options.animate,
      float: true,
      itemClass: 'mosaic-tile-item',
      draggable: { 
        handle: '.tile-header',
        scroll: true,
        appendTo: 'body',
      },
      resizable: { handles: 'se' },
    };

    if (options.placeholder?.enabled) {
      gridStackOptions.placeholderClass = options.placeholder.className ?? 'grid-stack-placeholder';
    }

    this.gridEngine = GridStack.init(gridStackOptions, container);

    // Manual initialization of widgets to map data-mosaic-* attributes to Gridstack internal state
    const items = container.querySelectorAll('.mosaic-tile-item');
    items.forEach(el => {
      const htmlEl = el as HTMLElement;
      this.gridEngine?.makeWidget(htmlEl, {
        id: htmlEl.getAttribute('data-mosaic-id') ?? undefined,
        x: parseInt(htmlEl.getAttribute('data-mosaic-x') ?? '0', 10),
        y: parseInt(htmlEl.getAttribute('data-mosaic-y') ?? '0', 10),
        w: parseInt(htmlEl.getAttribute('data-mosaic-w') ?? '1', 10),
        h: parseInt(htmlEl.getAttribute('data-mosaic-h') ?? '1', 10)
      });
    });

    this.gridEngine.on('change', () => {
      const updatedTiles = this.syncLayout();
      onLayoutChange(updatedTiles);
    });

    this.gridEngine.on('dragstart', () => {
      container.classList.add('grid-is-dragging');
    });

    this.gridEngine.on('dragstop', () => {
      container.classList.remove('grid-is-dragging');
    });

    this.gridEngine.on('resizestart', () => {
      container.classList.add('grid-is-resizing');
    });

    this.gridEngine.on('resizestop', () => {
      container.classList.remove('grid-is-resizing');
    });
  }

  private syncLayout(): Partial<MosaicTile>[] {
    if (!this.gridEngine) return [];

    const items = this.gridEngine.getGridItems();
    return items.map(item => {
      const node = item.gridstackNode as GridStackNode;
      const id = node?.id;

      return {
        id: (id as string) ?? '',
        x: node?.x ?? 0,
        y: node?.y ?? 0,
        w: node?.w ?? 1,
        h: node?.h ?? 1,
      };
    });
  }

  destroy(): void {
    this.gridEngine?.destroy();
    this.gridEngine = undefined;
  }
}
