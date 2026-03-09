import { Component, ElementRef, input, viewChild, afterNextRender, OnDestroy, output, inject, effect, untracked, ChangeDetectionStrategy, signal } from '@angular/core';
import { MosaicWidget, MosaicGridOptions, TilePosition } from '../../domain/mosaic.models';
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
  widgets = input.required<MosaicWidget[]>();
  widgetsChange = output<MosaicWidget[]>();
  deleteWidget = output<string>();

  protected selectedWidget = signal<MosaicWidget | null>(null);

  private gridEngine = inject(GRID_ENGINE);
  private gridContainer = viewChild<ElementRef<HTMLElement>>('gridContainer');
  private isUpdatingFromEngine = false;

  constructor() {
    afterNextRender(() => {
      this.initGrid();
    });

    effect(() => {
      this.widgets();
      untracked(() => {
        if (!this.isUpdatingFromEngine) {
          // New widgets might have been added to the DOM by Angular, tell Gridstack to adopt them
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

    this.gridEngine.init(el, options, (updatedWidgets) => {
      this.isUpdatingFromEngine = true;
      this.syncChanges(updatedWidgets);
      this.isUpdatingFromEngine = false;
    });
  }

  private syncChanges(engineWidgets: TilePosition[]) {
    const currentWidgets = this.widgets();
    let hasChanged = false;

    const updatedWidgets = currentWidgets.map(widget => {
      const match = engineWidgets.find(w => w.id === widget.id);
      if (match) {
        const changed =
          widget.x !== match.x ||
          widget.y !== match.y ||
          widget.w !== match.w ||
          widget.h !== match.h;

        if (changed) {
          hasChanged = true;
          return { ...widget, x: match.x, y: match.y, w: match.w, h: match.h };
        }
      }
      return widget;
    });

    if (hasChanged) {
      this.widgetsChange.emit(updatedWidgets);
    }
  }

  protected openSettings(widget: MosaicWidget) {
    this.selectedWidget.set(widget);
  }

  protected closeSettings() {
    this.selectedWidget.set(null);
  }

  protected removeWidget() {
    const widget = this.selectedWidget();
    if (widget) {
      this.gridEngine.removeWidget(widget.id);
      this.deleteWidget.emit(widget.id);
      this.closeSettings();
    }
  }

  protected toggleBookmarkMode() {
    const widget = this.selectedWidget();
    if (widget && widget.type === 'bookmark') {
      const newMode: 'grid' | 'list' = widget.configuration.displayMode === 'grid' ? 'list' : 'grid';
      const updatedWidgets = this.widgets().map(w => {
        if (w.id === widget.id && w.type === 'bookmark') {
          return { ...w, configuration: { ...w.configuration, displayMode: newMode } };
        }
        return w;
      });
      this.widgetsChange.emit(updatedWidgets);
      this.selectedWidget.set({ ...widget, configuration: { ...widget.configuration, displayMode: newMode } });
    }
  }

  ngOnDestroy() {
    this.gridEngine.destroy();
  }
}
