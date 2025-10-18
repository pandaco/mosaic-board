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

import { SettingsMenuManager } from './widgets/settings';
import { WidgetLifecycleManager } from './widgets/lifecycle';

const STORAGE_KEYS = [
    'dashboardLayout',
    'bookmarkWidgetPrefs',
    'weatherWidgetPrefs',
    'clockWidgetPrefs',
    'websiteWidgetPrefs'
];

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

            if (typeof importedSettings !== 'object' || importedSettings === null) {
                throw new Error("Invalid JSON format. Expected an object.");
            }

            if (!importedSettings[STORAGE_KEYS[0]]) {
                 console.warn("Imported settings might be incomplete or invalid (missing layout).");

            }

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

            input.value = '';
        }
    };

    reader.onerror = () => {
        alert(`Error reading file: ${reader.error}`);
        input.value = '';
    };

    reader.readAsText(file);
}

document.addEventListener('DOMContentLoaded', () => {
    console.log("Mosaic Board Initializing...");

    const modalManager = new ModalManager();

    const widgetLifecycleManager = new WidgetLifecycleManager();

    const settingsMenuManager = new SettingsMenuManager(modalManager, widgetLifecycleManager);

    widgetLifecycleManager.setSettingsMenuManager(settingsMenuManager);

    initGrid('#grid-container', () => {

        saveGridState();
    });

    widgetLifecycleManager.loadWidgets();

    const addWidgetButton = document.getElementById('add-widget-button');
    const addWidgetModal = document.getElementById('add-widget-modal');
    const closeAddModalButton = addWidgetModal?.querySelector('.modal-close-button');
    const widgetSelectionList = document.getElementById('widget-selection-list');

    addWidgetButton?.addEventListener('click', () => modalManager.openModal(addWidgetModal));
    closeAddModalButton?.addEventListener('click', () => modalManager.closeActiveModal());

    addWidgetModal?.addEventListener('click', (event) => {
        if (event.target === addWidgetModal) {
            modalManager.closeActiveModal();
        }
    });

    widgetSelectionList?.addEventListener('click', (event) => {
        const target = event.target as HTMLElement;
        const listItem = target.closest<HTMLElement>('li[data-widget-type]');
        if (listItem && listItem.dataset.widgetType) {
            const type = listItem.dataset.widgetType as WidgetType;
            widgetLifecycleManager.addWidget(type);
            modalManager.closeActiveModal();
        }
    });

     const exportButton = document.getElementById('export-settings-button');
     const importButton = document.getElementById('import-settings-button');
     const importFileInput = document.getElementById('import-file-input');

     exportButton?.addEventListener('click', exportSettings);

     importButton?.addEventListener('click', () => importFileInput?.click());

     importFileInput?.addEventListener('change', handleImportFile);

    console.log("Mosaic Board Initialized.");
});

window.addEventListener('unload', () => {
    console.log("Mosaic Board Unloading...");

});
