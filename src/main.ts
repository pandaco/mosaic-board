import './styles/base.css';
import './styles/buttons.css';
import './styles/grid.css';
import './styles/widgets.css';
import './styles/modals.css';
import './styles/settings.css';
import 'gridstack/dist/gridstack.min.css';

import { initGrid, saveGridState } from './grid';
import { WidgetType } from './types';
import { ModalManager } from './modals/modal';
// Importer les classes nécessaires
import { SettingsMenuManager } from './widgets/settings';
import { WidgetLifecycleManager } from './widgets/lifecycle';

const STORAGE_KEYS = [
    'dashboardLayout',
    'bookmarkWidgetPrefs',
    'weatherWidgetPrefs',
    'clockWidgetPrefs',
    'websiteWidgetPrefs'
];

/**
 * Exporte les paramètres actuels de l'extension dans un fichier JSON.
 */
async function exportSettings(): Promise<void> {
    try {
        const settings = await chrome.storage.local.get(STORAGE_KEYS);
        if (chrome.runtime.lastError) {
            throw new Error(`Export Error: ${chrome.runtime.lastError.message}`);
        }
        const settingsJson = JSON.stringify(settings, null, 4);
        const blob = new Blob([settingsJson], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const date = new Date();
        const timestamp = `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}`;
        a.download = `mosaic_board_settings_${timestamp}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        console.log("Settings exported successfully.");
    } catch (error) {
        console.error("Error exporting settings:", error);
        alert("Error exporting settings. Check console for details.");
    }
}

/**
 * Gère la sélection et l'importation d'un fichier de paramètres JSON.
 */
function handleImportFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    const reader = new FileReader();

    reader.onload = async (e) => {
        const content = e.target?.result;
        if (typeof content !== 'string') {
            alert("Error reading file content.");
            return;
        }
        try {
            const importedSettings = JSON.parse(content);
            // Validation basique de la structure importée
            if (typeof importedSettings !== 'object' || importedSettings === null) {
                throw new Error("Invalid JSON format. Expected an object.");
            }
            // Vérifier la présence d'au moins une clé attendue (ex: layout)
            if (!importedSettings[STORAGE_KEYS[0]]) { // Vérifie 'dashboardLayout'
                 console.warn("Imported settings might be incomplete or invalid (missing layout).");
                 // On peut choisir de continuer ou d'arrêter ici
            }

            // Effacer potentiellement les anciennes clés avant d'importer ?
            // await chrome.storage.local.clear(); // Attention: supprime TOUT

            await chrome.storage.local.set(importedSettings);
            if (chrome.runtime.lastError) {
                throw new Error(`Error saving imported settings: ${chrome.runtime.lastError.message}`);
            }
            console.log("Settings imported successfully.");
            alert("Settings imported successfully! Please reload the page (Ctrl+R or Cmd+R) for changes to take effect.");

        } catch (error) {
            console.error("Error importing settings:", error);
            let message = "Import Error: ";
            if (error instanceof SyntaxError) {
                message += "Invalid JSON format.";
            } else if (error instanceof Error) {
                message += error.message;
            } else {
                message += "Unknown error occurred.";
            }
            alert(message);
        } finally {
            // Réinitialiser l'input file pour permettre la réimportation du même fichier
            input.value = '';
        }
    };

    reader.onerror = () => {
        alert(`Error reading file: ${reader.error}`);
        input.value = ''; // Réinitialiser en cas d'erreur de lecture
    };

    reader.readAsText(file);
}


// --- Initialisation de l'application ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("Mosaic Board Initializing...");

    // --- Correction de l'ordre d'instanciation et injection de dépendance ---
    // 1. Instancier ModalManager (pas de dépendances externes)
    const modalManager = new ModalManager();

    // 2. Instancier WidgetLifecycleManager (n'a plus besoin de SettingsMenuManager dans son constructeur)
    const widgetLifecycleManager = new WidgetLifecycleManager();

    // 3. Instancier SettingsMenuManager en lui passant ses dépendances (ModalManager et WidgetLifecycleManager)
    const settingsMenuManager = new SettingsMenuManager(modalManager, widgetLifecycleManager);

    // 4. Injecter SettingsMenuManager dans WidgetLifecycleManager maintenant qu'il est créé
    widgetLifecycleManager.setSettingsMenuManager(settingsMenuManager);
    // --- Fin de la correction ---

    // Initialiser la grille GridStack
    initGrid('#grid-container', () => {
        // Callback appelé à chaque changement de la grille (drag, resize, add, remove)
        saveGridState(); // Sauvegarder la disposition
    });

    // Charger les widgets sauvegardés
    widgetLifecycleManager.loadWidgets(); // Utiliser la méthode de l'instance

    // --- Ajout des écouteurs d'événements ---

    // Bouton "Add Widget"
    const addWidgetButton = document.getElementById('add-widget-button');
    const addWidgetModal = document.getElementById('add-widget-modal');
    const closeAddModalButton = addWidgetModal?.querySelector('.modal-close-button');
    const widgetSelectionList = document.getElementById('widget-selection-list');

    addWidgetButton?.addEventListener('click', () => modalManager.openModal(addWidgetModal));
    closeAddModalButton?.addEventListener('click', () => modalManager.closeActiveModal());
    // Fermer la modale si on clique en dehors du contenu
    addWidgetModal?.addEventListener('click', (event) => {
        if (event.target === addWidgetModal) {
            modalManager.closeActiveModal();
        }
    });

    // Clic sur un type de widget dans la modale d'ajout
    widgetSelectionList?.addEventListener('click', (event) => {
        const target = event.target as HTMLElement;
        const listItem = target.closest<HTMLElement>('li[data-widget-type]');
        if (listItem && listItem.dataset.widgetType) {
            const type = listItem.dataset.widgetType as WidgetType;
            widgetLifecycleManager.addWidget(type); // Utiliser la méthode de l'instance
            modalManager.closeActiveModal();
        }
    });

     // Les écouteurs pour la modale de sélection de dossier sont gérés dans SettingsMenuManager

     // Boutons Import/Export
     const exportButton = document.getElementById('export-settings-button');
     const importButton = document.getElementById('import-settings-button');
     const importFileInput = document.getElementById('import-file-input');

     exportButton?.addEventListener('click', exportSettings);
     // Déclenche le clic sur l'input file caché
     importButton?.addEventListener('click', () => importFileInput?.click());
     // Gère le changement de fichier (sélection par l'utilisateur)
     importFileInput?.addEventListener('change', handleImportFile);

    console.log("Mosaic Board Initialized.");
});

// Optionnel: Nettoyage lors de la fermeture de l'onglet (peut être utile pour certains timers/listeners)
window.addEventListener('unload', () => {
    console.log("Mosaic Board Unloading...");
    // Ajouter ici d'éventuelles fonctions de nettoyage globales si nécessaire
});
