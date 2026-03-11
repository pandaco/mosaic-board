import { Injectable, inject, resource, linkedSignal, signal } from '@angular/core';
import { MosaicWidget, MosaicWidgetSchema } from './mosaic.models';
import { STORAGE_SERVICE } from '../ports/storage.port';
import { z } from 'zod';

const STORAGE_KEY = 'mosaic_layout';

const DEFAULT_WIDGETS: MosaicWidget[] = [
  { id: '1', x: 0, y: 0, w: 4, h: 1, title: 'My first tile', type: 'widget', content: 'Content 1' },
  { id: '2', x: 4, y: 0, w: 4, h: 1, title: 'Quick links', type: 'link', content: 'Content 2' },
  { id: '3', x: 0, y: 1, w: 4, h: 1, title: 'Image', type: 'image', content: 'Content 3' },
];

@Injectable({
  providedIn: 'root'
})
export class MosaicService {
  private storage = inject(STORAGE_SERVICE);

  // Source of truth from storage
  private layoutResource = resource({
    loader: async () => {
      try {
        const rawData = await this.storage.load<unknown>(STORAGE_KEY);
        if (!rawData) return null;

        const result = z.array(MosaicWidgetSchema).safeParse(rawData);
        if (!result.success) {
          console.error('Invalid layout data format:', result.error);
          return null;
        }

        return result.data;
      } catch (error) {
        this.handleStorageError('load', error);
        return null;
      }
    },
  });

  // Current state of widgets, reactive to layoutResource
  widgets = linkedSignal<MosaicWidget[] | null, MosaicWidget[]>({
    source: () => this.layoutResource.value(),
    computation: (newLayout) => newLayout ?? DEFAULT_WIDGETS,
  });

  // Exporting some state to UI
  isLoading = this.layoutResource.isLoading;
  error = this.layoutResource.error;
  saveError = signal<string | null>(null);

  reload() {
    this.layoutResource.reload();
  }

  updateWidgets(updatedWidgets: MosaicWidget[]) {
    if (this.isLoading() || updatedWidgets.length === 0) {
      return;
    }

    this.widgets.set(updatedWidgets);
    this.save(updatedWidgets);
  }

  deleteWidget(id: string) {
    const updatedWidgets = this.widgets().filter(w => w.id !== id);
    this.widgets.set(updatedWidgets);
    this.save(updatedWidgets, 'after deletion');
  }

  addWidget(type: 'widget' | 'link' | 'image' | 'bookmark') {
    const newWidget: MosaicWidget = type === 'bookmark'
      ? {
          id: crypto.randomUUID(), x: 0, y: 0, w: 6, h: 2,
          title: 'Bookmarks',
          type: 'bookmark',
          configuration: { displayMode: 'grid', useGoogleFavicons: false, showItemCount: true }
        }
      : {
          id: crypto.randomUUID(), x: 0, y: 0, w: 4, h: 1,
          title: type === 'link' ? 'Bookmark' : 'New Widget',
          type,
          content: type === 'link' ? 'https://google.com' : undefined
        };

    const updatedWidgets = [newWidget, ...this.widgets()];
    this.widgets.set(updatedWidgets);
    this.save(updatedWidgets, 'after addition');
  }

  private async save(widgets: MosaicWidget[], context = '') {
    try {
      await this.storage.save(STORAGE_KEY, widgets);
    } catch (error) {
      this.handleStorageError(`save ${context}`.trim(), error);
    }
  }

  dismissSaveError() {
    this.saveError.set(null);
  }

  private handleStorageError(operation: string, error: unknown) {
    console.error(`Storage error during ${operation}:`, error);
    this.saveError.set('Your changes could not be saved. Check available storage space.');
  }
}
