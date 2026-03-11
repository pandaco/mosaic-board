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

  private selectedWidgetId = signal<string | null>(null);
  protected selectedWidget = computed<MosaicWidget | null>(() =>
    this.widgets().find(w => w.id === this.selectedWidgetId()) ?? null
  );
  protected isFolderPickerOpen = signal(false);
  protected dropdownPosition = signal<{ top: number; right: number } | null>(null);
  protected selectedBookmarkWidget = computed<BookmarkWidget | null>(() => {
    const w = this.selectedWidget();
    return w?.type === 'bookmark' ? w : null;
  });

  private gridEngine = inject(GRID_ENGINE);
  private gridContainer = viewChild<ElementRef<HTMLElement>>('gridContainer');
  private isUpdatingFromEngine = false;
  private refreshTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    afterNextRender(() => {
      this.initGrid();
    });

    effect(() => {
      this.widgets();
      untracked(() => {
        if (!this.isUpdatingFromEngine) {
          // New widgets might have been added to the DOM by Angular, tell Gridstack to adopt them
          this.refreshTimer = setTimeout(() => this.gridEngine.refresh(), 0);
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
    if (this.selectedWidgetId() === widget.id) {
      this.closeSettings();
    } else {
      const btn = event.currentTarget as HTMLElement;
      const rect = btn.getBoundingClientRect();
      this.dropdownPosition.set({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
      this.selectedWidgetId.set(widget.id);
    }
  }

  protected closeSettings() {
    this.selectedWidgetId.set(null);
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
    const w = this.selectedBookmarkWidget();
    if (w) this.updateBookmarkConfig('displayMode', w.configuration.displayMode === 'grid' ? 'list' : 'grid');
  }

  protected openFolderPicker() {
    this.isFolderPickerOpen.set(true);
  }

  protected onFolderSelected(folder: FolderSelection) {
    const widget = this.selectedWidget();
    if (widget && widget.type === 'bookmark') {
      const updated = { ...widget, title: folder.title, configuration: { ...widget.configuration, rootFolderId: folder.id } };
      this.widgetsChange.emit(this.widgets().map(w => w.id === widget.id ? updated : w));
    }
    this.isFolderPickerOpen.set(false);
    this.closeSettings();
  }

  protected togglePrivacyMode() {
    const w = this.selectedBookmarkWidget();
    if (w) this.updateBookmarkConfig('useGoogleFavicons', !w.configuration.useGoogleFavicons);
  }

  protected toggleShowItemCount() {
    const w = this.selectedBookmarkWidget();
    if (w) this.updateBookmarkConfig('showItemCount', !w.configuration.showItemCount);
  }

  private updateBookmarkConfig<K extends keyof BookmarkWidget['configuration']>(key: K, value: BookmarkWidget['configuration'][K]): void {
    const widget = this.selectedWidget();
    if (!widget || widget.type !== 'bookmark') return;

    const updated = { ...widget, configuration: { ...widget.configuration, [key]: value } };
    this.widgetsChange.emit(this.widgets().map(w => w.id === widget.id ? updated : w));
    // selectedWidget is a computed derived from widgets(); no manual sync needed
  }

  ngOnDestroy() {
    clearTimeout(this.refreshTimer);
    this.gridEngine.destroy();
  }
}
