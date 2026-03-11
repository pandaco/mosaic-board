import { Component, ElementRef, input, viewChild, afterNextRender, OnDestroy, output, inject, effect, untracked, ChangeDetectionStrategy, signal, computed } from '@angular/core';
import { MosaicWidget, BookmarkWidget, MosaicGridOptions, TilePosition } from '../../domain/mosaic.models';
import { GRID_ENGINE } from '../../ports/grid-engine.port';
import { GridstackEngineAdapter } from '../../adapters/grid/gridstack.grid';
import { BookmarkWidgetComponent } from '../widgets/bookmark/bookmark.component';
import { FolderPickerComponent, FolderSelection } from '../folder-picker/folder-picker.component';

@Component({
  selector: 'app-grid',
  standalone: true,
  imports: [BookmarkWidgetComponent, FolderPickerComponent],
  templateUrl: './grid.component.html',
  styleUrl: './grid.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    { provide: GRID_ENGINE, useClass: GridstackEngineAdapter }
  ],
  host: {
    '(window:keydown.escape)': 'closeSettings()'
  }
})
export class GridComponent implements OnDestroy {
  widgets = input.required<MosaicWidget[]>();
  widgetsChange = output<MosaicWidget[]>();
  deleteWidget = output<string>();

  protected selectedWidget = signal<MosaicWidget | null>(null);
  protected isFolderPickerOpen = signal(false);
  protected dropdownPosition = signal<{ top: number; right: number } | null>(null);
  protected selectedBookmarkWidget = computed<BookmarkWidget | null>(() => {
    const w = this.selectedWidget();
    return w?.type === 'bookmark' ? w : null;
  });

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

  protected openSettings(widget: MosaicWidget, event: MouseEvent) {
    if (this.selectedWidget()?.id === widget.id) {
      this.closeSettings();
    } else {
      const btn = event.currentTarget as HTMLElement;
      const rect = btn.getBoundingClientRect();
      this.dropdownPosition.set({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
      this.selectedWidget.set(widget);
    }
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

  protected handleWidgetKeyDown(event: KeyboardEvent, widget: MosaicWidget) {
    const { key, shiftKey } = event;
    const step = 1;
    let updates: Partial<TilePosition> | null = null;

    switch (key) {
      case 'ArrowUp':
        updates = shiftKey ? { h: Math.max(1, widget.h - step) } : { y: Math.max(0, widget.y - step) };
        break;
      case 'ArrowDown':
        updates = shiftKey ? { h: widget.h + step } : { y: widget.y + step };
        break;
      case 'ArrowLeft':
        updates = shiftKey ? { w: Math.max(1, widget.w - step) } : { x: Math.max(0, widget.x - step) };
        break;
      case 'ArrowRight':
        updates = shiftKey ? { w: Math.max(1, widget.w + step) } : { x: widget.x + step };
        break;
    }

    if (updates) {
      event.preventDefault();
      this.gridEngine.updateWidget(widget.id, updates);
      
      // Gridstack will trigger 'change' event which will sync back to Angular
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

  protected openFolderPicker() {
    this.isFolderPickerOpen.set(true);
  }

  protected onFolderSelected(folder: FolderSelection) {
    const widget = this.selectedWidget();
    if (widget && widget.type === 'bookmark') {
      const updatedWidgets = this.widgets().map(w => {
        if (w.id === widget.id && w.type === 'bookmark') {
          return { ...w, title: folder.title, configuration: { ...w.configuration, rootFolderId: folder.id } };
        }
        return w;
      });
      this.widgetsChange.emit(updatedWidgets);
    }
    this.isFolderPickerOpen.set(false);
    this.closeSettings();
  }

  protected togglePrivacyMode() {
    const widget = this.selectedWidget();
    if (widget && widget.type === 'bookmark') {
      const newValue = !widget.configuration.useGoogleFavicons;
      const updatedWidgets = this.widgets().map(w => {
        if (w.id === widget.id && w.type === 'bookmark') {
          return { ...w, configuration: { ...w.configuration, useGoogleFavicons: newValue } };
        }
        return w;
      });
      this.widgetsChange.emit(updatedWidgets);
      this.selectedWidget.set({ ...widget, configuration: { ...widget.configuration, useGoogleFavicons: newValue } });
    }
  }

  protected toggleShowItemCount() {
    const widget = this.selectedWidget();
    if (widget && widget.type === 'bookmark') {
      const newValue = !widget.configuration.showItemCount;
      const updatedWidgets = this.widgets().map(w => {
        if (w.id === widget.id && w.type === 'bookmark') {
          return { ...w, configuration: { ...w.configuration, showItemCount: newValue } };
        }
        return w;
      });
      this.widgetsChange.emit(updatedWidgets);
      this.selectedWidget.set({ ...widget, configuration: { ...widget.configuration, showItemCount: newValue } });
    }
  }

  ngOnDestroy() {
    this.gridEngine.destroy();
  }
}
