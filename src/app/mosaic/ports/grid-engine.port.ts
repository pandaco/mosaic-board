import { InjectionToken } from '@angular/core';
import { MosaicGridOptions, MosaicTile } from '../domain/mosaic.models';

/**
 * Port (Interface) for any Grid Engine implementation.
 * The application depends on this abstraction, not on a specific library.
 */
export interface GridEnginePort {
  /**
   * Initializes the grid on the given HTML container.
   */
  init(container: HTMLElement, options: MosaicGridOptions, onLayoutChange: (tiles: Partial<MosaicTile>[]) => void): void;
  
  /**
   * Cleans up the grid engine and removes event listeners.
   */
  destroy(): void;

  /**
   * Removes a widget from the grid by its ID.
   */
  removeWidget(id: string): void;
}

/**
 * Angular Injection Token to provide the specific implementation at runtime.
 */
export const GRID_ENGINE = new InjectionToken<GridEnginePort>('GRID_ENGINE');
