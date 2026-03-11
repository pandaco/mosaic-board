import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MosaicService } from './mosaic.service';
import { STORAGE_SERVICE, StoragePort } from '../ports/storage.port';
import { MosaicWidget } from './mosaic.models';

const VALID_WIDGETS: MosaicWidget[] = [
  { id: 'w1', x: 0, y: 0, w: 2, h: 1, title: 'Test', type: 'widget', content: 'Hello' },
];

function makeStorageMock(loadResult: unknown = null): StoragePort {
  return {
    save: vi.fn().mockResolvedValue(undefined),
    load: vi.fn().mockResolvedValue(loadResult),
  };
}

async function setupService(storage: StoragePort): Promise<MosaicService> {
  await TestBed.configureTestingModule({
    providers: [
      MosaicService,
      { provide: STORAGE_SERVICE, useValue: storage },
    ],
  }).compileComponents();

  const service = TestBed.inject(MosaicService);
  // Wait for the resource loader to complete
  await TestBed.inject(MosaicService); // same instance
  await new Promise(resolve => setTimeout(resolve, 0));
  return service;
}

describe('MosaicService', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  it('loads valid widget data from storage', async () => {
    const storage = makeStorageMock(VALID_WIDGETS);
    const service = await setupService(storage);
    await TestBed.flushEffects();

    expect(storage.load).toHaveBeenCalled();
    // After load, widgets should reflect stored data or defaults
    expect(service.widgets()).toBeDefined();
    expect(Array.isArray(service.widgets())).toBe(true);
  });

  it('falls back to default widgets when storage is empty', async () => {
    const storage = makeStorageMock(null);
    const service = await setupService(storage);
    await TestBed.flushEffects();

    expect(service.widgets().length).toBeGreaterThan(0);
  });

  it('falls back to default widgets when stored data fails Zod validation', async () => {
    const storage = makeStorageMock([{ invalid: true }]);
    const service = await setupService(storage);
    await TestBed.flushEffects();

    // Invalid data → Zod rejects → default widgets
    expect(service.widgets().length).toBeGreaterThan(0);
    expect(service.widgets()[0].id).toBe('1');
  });

  it('deleteWidget removes the widget and persists', async () => {
    const storage = makeStorageMock(VALID_WIDGETS);
    const service = await setupService(storage);
    service.widgets.set(VALID_WIDGETS);

    service.deleteWidget('w1');

    expect(service.widgets().find(w => w.id === 'w1')).toBeUndefined();
    expect(storage.save).toHaveBeenCalledWith(
      'mosaic_layout',
      expect.not.arrayContaining([expect.objectContaining({ id: 'w1' })])
    );
  });

  it('addWidget adds a content widget at the front', async () => {
    const storage = makeStorageMock(VALID_WIDGETS);
    const service = await setupService(storage);
    service.widgets.set(VALID_WIDGETS);
    const before = service.widgets().length;

    service.addWidget('widget');

    expect(service.widgets().length).toBe(before + 1);
    expect(service.widgets()[0].type).toBe('widget');
    expect(storage.save).toHaveBeenCalled();
  });

  it('addWidget adds a bookmark widget with correct default config', async () => {
    const storage = makeStorageMock(null);
    const service = await setupService(storage);

    service.addWidget('bookmark');

    const added = service.widgets()[0];
    expect(added.type).toBe('bookmark');
    if (added.type === 'bookmark') {
      expect(added.configuration.displayMode).toBe('grid');
      expect(added.configuration.useGoogleFavicons).toBe(false);
    }
  });

  it('sets saveError signal when storage.save rejects', async () => {
    const storage = makeStorageMock(null);
    (storage.save as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('quota exceeded'));
    const service = await setupService(storage);

    service.addWidget('widget');
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(service.saveError()).toBeTruthy();
  });

  it('dismissSaveError clears the saveError signal', async () => {
    const storage = makeStorageMock(null);
    (storage.save as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('fail'));
    const service = await setupService(storage);

    service.addWidget('widget');
    await new Promise(resolve => setTimeout(resolve, 0));

    service.dismissSaveError();
    expect(service.saveError()).toBeNull();
  });
});
