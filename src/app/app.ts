import { Component, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { CdkTrapFocus } from '@angular/cdk/a11y';
import { GridComponent } from './mosaic/ui/grid/grid.component';
import { MosaicWidget } from './mosaic/domain/mosaic.models';
import { MosaicService } from './mosaic/domain/mosaic.service';
import { APP_VERSION } from './version';

@Component({
  imports: [GridComponent, NgOptimizedImage, CdkTrapFocus],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(window:keydown.escape)': 'closeAddModal()'
  }
})
export class App {
  protected title = 'Mosaic Board';
  protected version = typeof chrome !== 'undefined' && chrome.runtime?.getManifest
    ? chrome.runtime.getManifest().version
    : APP_VERSION;

  private mosaicService = inject(MosaicService);

  // Expose signals from service
  protected widgets = this.mosaicService.widgets;
  protected isLoading = this.mosaicService.isLoading;
  protected error = this.mosaicService.error;
  protected saveError = this.mosaicService.saveError;
  protected isAddModalOpen = signal(false);

  protected reload() {
    this.mosaicService.reload();
  }

  protected dismissSaveError() {
    this.mosaicService.dismissSaveError();
  }

  onWidgetsChange(updatedWidgets: MosaicWidget[]) {
    this.mosaicService.updateWidgets(updatedWidgets);
  }

  onDeleteWidget(id: string) {
    this.mosaicService.deleteWidget(id);
  }

  protected openAddModal() {
    this.isAddModalOpen.set(true);
  }

  protected closeAddModal() {
    this.isAddModalOpen.set(false);
  }

  protected addWidget(type: 'widget' | 'link' | 'image' | 'bookmark') {
    this.mosaicService.addWidget(type);
    this.closeAddModal();
  }
}
