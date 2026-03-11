import { InjectionToken } from '@angular/core';
import { MosaicGridOptions, TilePosition } from '../domain/mosaic.models';

/**
 * Port (Interface) for any Grid Engine implementation.
 * The application depends on this abstraction, not on a specific library.
 */
export interface GridEnginePort {
  /**
   * Initializes the grid on the given HTML container.
   */
  init(container: HTMLElement, options: MosaicGridOptions, onLayoutChange: (widgets: TilePosition[]) => void): void;

  /**
   * Cleans up the grid engine and removes event listeners.
   */
  destroy(): void;

  /**
   * Removes a widget from the grid by its ID.
   */
  removeWidget(id: string): void;

  /**
   * Refreshes the grid engine to detect and initialize new elements.
   */
  refresh(): void;

  /**
   * Updates a widget's position or size.
   */
  updateWidget(id: string, updates: Partial<TilePosition>): void;
}

/**
 * Angular Injection Token to provide the specific implementation at runtime.
 */
export const GRID_ENGINE = new InjectionToken<GridEnginePort>('GRID_ENGINE');
