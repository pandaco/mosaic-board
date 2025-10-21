import { WidgetLayout, WidgetType } from '../types';
import { addWidgetToGrid, removeWidgetFromGrid, saveGridState, loadGridState } from '../grid';
import { deletePreferences, savePreferences, getWidgetPreferences } from '../storage.service';
import { createWidgetElement, getDefaultPreferences } from './factory';

import { SettingsMenuManager } from './settings';

import * as BookmarkWidget from './bookmark/bookmark.widget';
import * as WeatherWidget from './weather/weather.widget';
import * as ClockWidget from './clock/clock.widget';
import * as WebsiteWidget from './website/website.widget';

export class WidgetLifecycleManager {

    private settingsMenuManager: SettingsMenuManager | null = null;
    private widgetInstances = new Map<string, any>();

    constructor() {
        console.log("WidgetLifecycleManager initialized");
        document.addEventListener('delete-widget-request', this.handleDeleteRequest.bind(this));
    }

    setSettingsMenuManager(manager: SettingsMenuManager): void {
        this.settingsMenuManager = manager;
        console.log("SettingsMenuManager injected into WidgetLifecycleManager");
    }

    private handleDeleteRequest(event: Event): void {
        const customEvent = event as CustomEvent;
        const widgetId = customEvent.detail?.widgetId;
        if (widgetId) {
            this.removeWidget(widgetId);
        }
    }

    private widgetInitializers: { [key in WidgetType]?: (id: string, element: HTMLElement, prefs: any) => void } = {
        [WidgetType.Bookmarks]: BookmarkWidget.initBookmarkWidget,
        [WidgetType.Weather]: WeatherWidget.initWeatherWidget,
        [WidgetType.Clock]: ClockWidget.initClockWidget,
        [WidgetType.Website]: WebsiteWidget.initWebsiteWidget,
    };

    private widgetPreferenceUpdaters: { [key in WidgetType]?: (id: string, prefs: any) => void } = {
         [WidgetType.Bookmarks]: BookmarkWidget.updateBookmarkWidgetPreferences,
         [WidgetType.Weather]: WeatherWidget.updateWeatherWidgetPreferences,
         [WidgetType.Clock]: ClockWidget.updateClockWidgetPreferences,
         [WidgetType.Website]: WebsiteWidget.updateWebsiteWidgetPreferences,
    };

    private widgetCleaners: { [key in WidgetType]?: (id: string) => void } = {
         [WidgetType.Clock]: ClockWidget.cleanupClockWidget,
         [WidgetType.Website]: WebsiteWidget.cleanupWebsiteWidget,

    };

    async addWidget(type: WidgetType): Promise<void> {
        if (!this.settingsMenuManager) {
             console.error("SettingsMenuManager not set in WidgetLifecycleManager. Cannot add widget.");
             return;
        }
        console.log(`Adding widget of type: ${type}`);
        const id = `widget-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const widgetElement = createWidgetElement(id, type);

        if (widgetElement) {
            const contentElement = widgetElement.querySelector('.grid-stack-item-content') as HTMLElement | null;
            if (!contentElement) {
                console.error(`Could not find .grid-stack-item-content for new widget ${id}`);
                return;
            }

            const settingsButton = widgetElement.querySelector('.widget-settings-button');
            if (settingsButton && this.settingsMenuManager) {

                 const currentSettingsManager = this.settingsMenuManager;
                 settingsButton.addEventListener('click', (event) => {
                    event.stopPropagation();

                    currentSettingsManager.toggleWidgetSettingsMenu(id, type, settingsButton as HTMLElement);
                });
            } else if (!settingsButton) {
                 console.warn(`Settings button not found for widget ${id}`);
            } else {
                 console.warn(`SettingsMenuManager not available when adding listener for widget ${id}`);
            }

            const defaultSize = (type === WidgetType.Website) ? { w: 6, h: 4 } : { w: 4, h: 3 };
            addWidgetToGrid(widgetElement, { ...defaultSize, id: id });

            const initializer = this.widgetInitializers[type];
            if (initializer) {
                const defaultPrefs = getDefaultPreferences(type);
                if (defaultPrefs) {
                     try {
                         initializer(id, contentElement, defaultPrefs);
                         await savePreferences(id, type, defaultPrefs);
                         console.log(`Widget ${id} (${type}) initialized and default prefs saved.`);
                     } catch (error) {
                          console.error(`Error initializing widget ${id} (${type}):`, error);
                          contentElement.innerHTML = `<p class="error">Init error</p>`;
                     }
                } else {
                     console.warn(`No default preferences found for ${type}. Initializing with empty object.`);
                     initializer(id, contentElement, {});
                }
            } else {
                console.warn(`No initializer found for widget type: ${type}`);
                contentElement.innerHTML = `<p class="error">Unknown type</p>`;
            }
            saveGridState();
        } else {
             console.error(`Failed to create widget element for type: ${type}`);
        }
    }

    async removeWidget(widgetId: string): Promise<void> {
        console.log(`Removing widget: ${widgetId}`);
        const widgetElement = document.getElementById(widgetId);
        if (widgetElement && widgetElement.dataset.widgetType) {
            const widgetType = widgetElement.dataset.widgetType as WidgetType;

            this.settingsMenuManager?.closeWidgetSettingsMenuIfActive(widgetId);

            const cleaner = this.widgetCleaners[widgetType];
            if (cleaner) {
                try {
                    cleaner(widgetId);
                    console.log(`Cleanup function executed for widget ${widgetId}`);
                } catch (error) {
                    console.error(`Error cleaning up widget ${widgetId}:`, error);
                }
            }

            this.widgetInstances.delete(widgetId);

            removeWidgetFromGrid(widgetElement);

            await deletePreferences(widgetId, widgetType);
            console.log(`Preferences deleted for widget ${widgetId}`);

            saveGridState();
        } else {
            console.error(`Widget element not found or type missing for ID during removal: ${widgetId}`);
        }
    }

    async loadWidgets(): Promise<void> {
        if (!this.settingsMenuManager) {
             console.error("SettingsMenuManager not set in WidgetLifecycleManager. Cannot load widgets.");
             return;
        }
        console.log("Loading widgets from saved state...");
        await loadGridState(async (item: WidgetLayout): Promise<HTMLElement | null> => {
            console.log(`Attempting to load widget: ${item.id} (${item.type})`);
            const widgetContainer = createWidgetElement(item.id, item.type);
            if (widgetContainer) {
                const contentElement = widgetContainer.querySelector('.grid-stack-item-content') as HTMLElement | null;
                if (contentElement) {

                    const settingsButton = widgetContainer.querySelector('.widget-settings-button');
                     if (settingsButton && this.settingsMenuManager) {

                         const currentSettingsManager = this.settingsMenuManager;
                         settingsButton.addEventListener('click', (event) => {
                            event.stopPropagation();

                            currentSettingsManager.toggleWidgetSettingsMenu(item.id, item.type, settingsButton as HTMLElement);
                        });
                    } else if (!settingsButton) {
                         console.warn(`Settings button not found for loaded widget ${item.id}`);
                    } else {
                         console.warn(`SettingsMenuManager not available when adding listener for loaded widget ${item.id}`);
                    }

                    const initializer = this.widgetInitializers[item.type];
                    if (initializer) {
                        try {
                            const prefs = await getWidgetPreferences<any>(item.id, item.type) || getDefaultPreferences(item.type);
                            if (prefs) {
                                initializer(item.id, contentElement, prefs);
                                console.log(`Widget ${item.id} (${item.type}) initialized with preferences.`);
                            } else {
                                console.warn(`No preferences found for ${item.id} (${item.type}), initializing with empty object.`);
                                initializer(item.id, contentElement, {});
                            }
                        } catch (error) {
                             console.error(`Error initializing loaded widget ${item.id} (${item.type}):`, error);
                             contentElement.innerHTML = `<p class="error">Init error</p>`;
                        }
                    } else {
                        console.warn(`No initializer for loaded widget type: ${item.type}`);
                        contentElement.innerHTML = `<p class="error">Unknown type</p>`;
                    }
                } else {
                     console.error(`Could not find .grid-stack-item-content for loaded widget ${item.id}`);
                     return null;
                }
            } else {
                 console.error(`Failed to create widget element for loaded widget: ${item.id} (${item.type})`);
                 return null;
            }
            return widgetContainer;
        });
        console.log("Widget loading complete.");
    }

    async updateWidgetPreference(widgetId: string, type: WidgetType, key: string, value: any): Promise<void> {
         console.log(`Updating preference '${key}' to '${value}' for widget ${widgetId} (${type})`);
         try {

            const currentPrefs = await getWidgetPreferences<any>(widgetId, type) || getDefaultPreferences(type) || {};

            const newPrefs = { ...currentPrefs, [key]: value };

            await savePreferences(widgetId, type, newPrefs);
            console.log(`Preferences saved for widget ${widgetId}`);

            const updater = this.widgetPreferenceUpdaters[type];
            if (updater) {
                updater(widgetId, newPrefs);
                console.log(`Preference updater called for widget ${widgetId}`);
            } else {
                console.warn(`No preference updater function found for widget type: ${type}`);
            }
        } catch (error) {
            console.error(`Failed to update preference ${key} for widget ${widgetId}:`, error);
        }
    }

    async updateSettingsMenuFolderButtonText(widgetId: string, folderId: string | null): Promise<void> {

         if (!this.settingsMenuManager || !this.settingsMenuManager.isSettingsMenuOpenFor(widgetId)) {

             return;
         }

         const menu = this.settingsMenuManager.getActiveSettingsMenuElement();
         if (!menu) return;

         const folderButtonSpan = menu.querySelector<HTMLElement>('.folder-setting-button .current-folder-name');
         if (!folderButtonSpan) {
              console.warn(`Could not find folder button span in settings menu for widget ${widgetId}`);
              return;
         }

         let folderName = 'Root';
         if (folderId && folderId !== '0' && folderId !== '1') {
             try {
                 const nodes = await chrome.bookmarks.get(folderId);
                 if (nodes && nodes.length > 0) {
                      folderName = nodes[0].title || `Folder ${folderId}`;
                 } else {
                      console.warn(`Folder with ID ${folderId} not found.`);
                      folderName = 'Unknown Folder';
                 }
             } catch (e) {
                 console.error(`Error getting folder name for ID ${folderId}:`, e);
                 folderName = 'Error';
             }
         } else if (folderId === '1') {
             folderName = 'Bookmarks Bar';
         } else {
             folderName = 'Root';
         }

         folderButtonSpan.textContent = `(${folderName})`;
         folderButtonSpan.title = folderName;
         console.log(`Updated folder button text for widget ${widgetId} to: ${folderName}`);
    }
}
