import { WidgetLayout, WidgetType } from '../types';
import { addWidgetToGrid, removeWidgetFromGrid, saveGridState, loadGridState } from '../grid';
import { deletePreferences, savePreferences, getWidgetPreferences } from '../storage-service';
import { createWidgetElement, getDefaultPreferences } from './factory';
// Importer SettingsMenuManager pour l'injection de dépendance et le typage
import { SettingsMenuManager } from './settings';

// Importer les modules de widgets
import * as BookmarkWidget from './bookmark/bookmark.widget';
import * as WeatherWidget from './weather/weather.widget';
import * as ClockWidget from './clock/clock.widget';
import * as WebsiteWidget from './website/website.widget';

export class WidgetLifecycleManager {
    // La dépendance est maintenant optionnelle dans le constructeur et sera injectée
    private settingsMenuManager: SettingsMenuManager | null = null;
    private widgetInstances = new Map<string, any>(); // Garde une trace des instances (si nécessaire)

    // Le constructeur n'a plus besoin de SettingsMenuManager
    constructor() {
        console.log("WidgetLifecycleManager initialized");
        document.addEventListener('delete-widget-request', this.handleDeleteRequest.bind(this));
    }

    // Méthode pour injecter SettingsMenuManager après l'instanciation
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

    // --- Mappings des fonctions de cycle de vie ---
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
         // Ajouter d'autres cleaners si nécessaire
    };

    // --- Méthodes de cycle de vie ---

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

            // Attacher l'écouteur pour le bouton des paramètres
            const settingsButton = widgetElement.querySelector('.widget-settings-button');
            if (settingsButton && this.settingsMenuManager) { // Vérifier si settingsMenuManager est défini
                 // Utiliser une copie locale de settingsMenuManager pour la closure
                 const currentSettingsManager = this.settingsMenuManager;
                 settingsButton.addEventListener('click', (event) => {
                    event.stopPropagation();
                    // Utiliser la méthode de l'instance de SettingsMenuManager injectée
                    currentSettingsManager.toggleWidgetSettingsMenu(id, type, settingsButton as HTMLElement);
                });
            } else if (!settingsButton) {
                 console.warn(`Settings button not found for widget ${id}`);
            } else {
                 console.warn(`SettingsMenuManager not available when adding listener for widget ${id}`);
            }


            // Définir la taille par défaut
            const defaultSize = (type === WidgetType.Website) ? { w: 6, h: 4 } : { w: 4, h: 3 };
            addWidgetToGrid(widgetElement, { ...defaultSize, id: id });

            // Initialiser le widget avec ses préférences par défaut
            const initializer = this.widgetInitializers[type];
            if (initializer) {
                const defaultPrefs = getDefaultPreferences(type);
                if (defaultPrefs) {
                     try {
                         initializer(id, contentElement, defaultPrefs);
                         await savePreferences(id, type, defaultPrefs); // Sauvegarder les prefs par défaut
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
            saveGridState(); // Sauvegarder la nouvelle disposition de la grille
        } else {
             console.error(`Failed to create widget element for type: ${type}`);
        }
    }

    async removeWidget(widgetId: string): Promise<void> {
        console.log(`Removing widget: ${widgetId}`);
        const widgetElement = document.getElementById(widgetId);
        if (widgetElement && widgetElement.dataset.widgetType) {
            const widgetType = widgetElement.dataset.widgetType as WidgetType;

            // Fermer le menu des paramètres si c'est celui du widget supprimé
            this.settingsMenuManager?.closeWidgetSettingsMenuIfActive(widgetId);


            // Exécuter la fonction de nettoyage si elle existe
            const cleaner = this.widgetCleaners[widgetType];
            if (cleaner) {
                try {
                    cleaner(widgetId);
                    console.log(`Cleanup function executed for widget ${widgetId}`);
                } catch (error) {
                    console.error(`Error cleaning up widget ${widgetId}:`, error);
                }
            }

            // Supprimer l'instance (si gérée)
            this.widgetInstances.delete(widgetId);

            // Retirer de la grille et du DOM
            removeWidgetFromGrid(widgetElement);

            // Supprimer les préférences
            await deletePreferences(widgetId, widgetType);
            console.log(`Preferences deleted for widget ${widgetId}`);

            // Sauvegarder la nouvelle disposition
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
                    // Attacher l'écouteur pour le bouton des paramètres
                    const settingsButton = widgetContainer.querySelector('.widget-settings-button');
                     if (settingsButton && this.settingsMenuManager) { // Vérifier si settingsMenuManager est défini
                         // Utiliser une copie locale de settingsMenuManager pour la closure
                         const currentSettingsManager = this.settingsMenuManager;
                         settingsButton.addEventListener('click', (event) => {
                            event.stopPropagation();
                            // Utiliser la méthode de l'instance de SettingsMenuManager injectée
                            currentSettingsManager.toggleWidgetSettingsMenu(item.id, item.type, settingsButton as HTMLElement);
                        });
                    } else if (!settingsButton) {
                         console.warn(`Settings button not found for loaded widget ${item.id}`);
                    } else {
                         console.warn(`SettingsMenuManager not available when adding listener for loaded widget ${item.id}`);
                    }

                    // Initialiser le widget avec ses préférences sauvegardées ou par défaut
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

    // --- Méthodes publiques pour les autres modules (ex: SettingsMenuManager) ---

    // Met à jour une préférence spécifique pour un widget
    async updateWidgetPreference(widgetId: string, type: WidgetType, key: string, value: any): Promise<void> {
         console.log(`Updating preference '${key}' to '${value}' for widget ${widgetId} (${type})`);
         try {
            // Charger les préférences actuelles ou utiliser les défauts
            const currentPrefs = await getWidgetPreferences<any>(widgetId, type) || getDefaultPreferences(type) || {};
            // Créer le nouvel objet de préférences
            const newPrefs = { ...currentPrefs, [key]: value };
            // Sauvegarder les nouvelles préférences
            await savePreferences(widgetId, type, newPrefs);
            console.log(`Preferences saved for widget ${widgetId}`);

            // Appeler la fonction de mise à jour du widget spécifique, si elle existe
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

    // Met à jour le texte du bouton de sélection de dossier dans le menu des paramètres (spécifique aux Bookmarks)
    async updateSettingsMenuFolderButtonText(widgetId: string, folderId: string | null): Promise<void> {
         // Vérifier si le SettingsMenuManager est défini et si le menu actif correspond au widgetId
         if (!this.settingsMenuManager || !this.settingsMenuManager.isSettingsMenuOpenFor(widgetId)) {
             // console.log(`Settings menu for ${widgetId} is not open or manager not set, skipping folder button text update.`);
             return;
         }

         const menu = this.settingsMenuManager.getActiveSettingsMenuElement(); // Obtenir l'élément de menu actif
         if (!menu) return; // Sécurité supplémentaire

         const folderButtonSpan = menu.querySelector<HTMLElement>('.folder-setting-button .current-folder-name');
         if (!folderButtonSpan) {
              console.warn(`Could not find folder button span in settings menu for widget ${widgetId}`);
              return;
         }

         let folderName = 'Root'; // Nom par défaut
         if (folderId && folderId !== '0' && folderId !== '1') { // Ne pas chercher '0' ou '1' qui sont spéciaux
             try {
                 const nodes = await chrome.bookmarks.get(folderId);
                 if (nodes && nodes.length > 0) {
                      folderName = nodes[0].title || `Folder ${folderId}`; // Utiliser le titre ou l'ID
                 } else {
                      console.warn(`Folder with ID ${folderId} not found.`);
                      folderName = 'Unknown Folder'; // Indiquer que le dossier n'a pas été trouvé
                 }
             } catch (e) {
                 console.error(`Error getting folder name for ID ${folderId}:`, e);
                 folderName = 'Error'; // Indiquer une erreur
             }
         } else if (folderId === '1') {
             folderName = 'Bookmarks Bar'; // Nom spécifique pour la barre personnelle
         } else {
             folderName = 'Root'; // Cas de '0' ou null/undefined
         }

         folderButtonSpan.textContent = `(${folderName})`;
         folderButtonSpan.title = folderName; // Mettre à jour le tooltip aussi
         console.log(`Updated folder button text for widget ${widgetId} to: ${folderName}`);
    }
}
