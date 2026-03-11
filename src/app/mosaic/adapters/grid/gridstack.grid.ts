import { Injectable } from '@angular/core';
import { GridStack, GridStackNode, GridStackOptions } from 'gridstack';
import { MosaicGridOptions, TilePosition } from '../../domain/mosaic.models';
import { GridEnginePort } from '../../ports/grid-engine.port';

/**
 * Adapter for the GridStack library.
 * It implements the GridEnginePort to map our domain to GridStack specifics.
 */
@Injectable()
export class GridstackEngineAdapter implements GridEnginePort {
  private gridEngine?: GridStack;

  init(container: HTMLElement, options: MosaicGridOptions, onLayoutChange: (widgets: TilePosition[]) => void): void {
    const gridStackOptions: GridStackOptions = {
      column: options.columns,
      cellHeight: options.cellHeight,
      margin: options.margin,
      animate: options.animate,
      float: true,
      itemClass: 'grid-stack-item', // Keep standard for CSS
      draggable: {
        handle: '.widget-header',
        scroll: true,
        appendTo: 'body',
      },
      resizable: { handles: 'se' },
    };

    if (options.placeholder?.enabled) {
      gridStackOptions.placeholderClass = options.placeholder.className ?? 'grid-stack-placeholder';
    }

    this.gridEngine = GridStack.init(gridStackOptions, container);

    // Manual initialization of widgets to map data-mosaic-* attributes
    // Use setTimeout 0 to ensure DOM is perfectly ready if needed, but in afterNextRender it's fine
    const items = container.querySelectorAll('.mosaic-widget-item');

    items.forEach(el => {
      const htmlEl = el as HTMLElement;
      this.gridEngine?.makeWidget(htmlEl, {
        id: htmlEl.getAttribute('data-mosaic-id') ?? undefined,
        x: parseInt(htmlEl.getAttribute('data-mosaic-x') ?? '0', 10),
        y: parseInt(htmlEl.getAttribute('data-mosaic-y') ?? '0', 10),
        w: parseInt(htmlEl.getAttribute('data-mosaic-w') ?? '1', 10),
        h: parseInt(htmlEl.getAttribute('data-mosaic-h') ?? '1', 10),
        autoPosition: false, // Force use of our coordinates
      });
    });

    this.gridEngine.on('change', () => {
      this.throttledSync(onLayoutChange);
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

  private throttledSyncTimer?: ReturnType<typeof setTimeout>;
  private throttledSync(onLayoutChange: (widgets: TilePosition[]) => void) {
    if (this.throttledSyncTimer) return;

    this.throttledSyncTimer = setTimeout(() => {
      const updatedWidgets = this.syncLayout();
      if (updatedWidgets.length > 0) {
        onLayoutChange(updatedWidgets);
      }
      this.throttledSyncTimer = undefined;
    }, 100); // 100ms throttle
  }

  private syncLayout(): TilePosition[] {
    if (!this.gridEngine) return [];

    const items = this.gridEngine.getGridItems();
    return items.map(item => {
      const el = item as HTMLElement;
      const node = item.gridstackNode as GridStackNode;
      // Critical: read ID from DOM attribute if Gridstack hasn't mapped it to the node yet
      const id = node?.id || el.getAttribute('data-mosaic-id');

      return {
        id: (id as string) ?? '',
        x: node?.x ?? 0,
        y: node?.y ?? 0,
        w: node?.w ?? 1,
        h: node?.h ?? 1,
      };
    }).filter(widget => !!widget.id);
  }

  destroy(): void {
    this.gridEngine?.destroy();
    this.gridEngine = undefined;
  }

  removeWidget(id: string): void {
    if (!this.gridEngine) return;

    // Find the widget element by our domain ID
    const items = this.gridEngine.getGridItems();
    const itemToRemove = items.find(item => {
      const el = item as HTMLElement;
      const node = item.gridstackNode as GridStackNode;
      return node?.id === id || el.getAttribute('data-mosaic-id') === id;
    });

    if (itemToRemove) {
      // removeDOM = false because Angular manages the DOM via signals
      this.gridEngine.removeWidget(itemToRemove, false);
    } else {
      console.error(`[Gridstack] Could not find widget to remove with ID: ${id}`);
    }
  }

  refresh(): void {
    if (!this.gridEngine) return;

    const container = this.gridEngine.el;
    // Find elements that are not yet initialized by Gridstack
    const items = container.querySelectorAll('.mosaic-widget-item:not(.grid-stack-item)');

    items.forEach(el => {
      const htmlEl = el as HTMLElement;
      this.gridEngine?.makeWidget(htmlEl, {
        id: htmlEl.getAttribute('data-mosaic-id') ?? undefined,
        x: parseInt(htmlEl.getAttribute('data-mosaic-x') ?? '0', 10),
        y: parseInt(htmlEl.getAttribute('data-mosaic-y') ?? '0', 10),
        w: parseInt(htmlEl.getAttribute('data-mosaic-w') ?? '1', 10),
        h: parseInt(htmlEl.getAttribute('data-mosaic-h') ?? '1', 10),
        autoPosition: true, // Improved for new widgets: let Gridstack find the best spot if 0,0 is taken
      });
    });
  }

  updateWidget(id: string, updates: Partial<TilePosition>): void {
    if (!this.gridEngine) return;

    const items = this.gridEngine.getGridItems();
    const itemToUpdate = items.find(item => {
      const el = item as HTMLElement;
      const node = item.gridstackNode as GridStackNode;
      return node?.id === id || el.getAttribute('data-mosaic-id') === id;
    });

    if (itemToUpdate) {
      this.gridEngine.update(itemToUpdate, updates);
    }
  }
}
