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
import {
    StorageKey,
    FILE_CONFIG,
    DATE_FORMAT,
    DomSelector,
    USER_MESSAGES,
    LOG_MESSAGES,
    CssClass,
} from './constants';

import { SettingsMenuManager } from './widgets/settings';
import { WidgetLifecycleManager } from './widgets/lifecycle';

const EXPORTABLE_STORAGE_KEYS = [
    StorageKey.DashboardLayout,
    StorageKey.BookmarkWidgetPrefs,
    StorageKey.WeatherWidgetPrefs,
    StorageKey.ClockWidgetPrefs,
    StorageKey.WebsiteWidgetPrefs,
];

async function exportSettings(): Promise<void> {
    try {
        const settings = await chrome.storage.local.get(EXPORTABLE_STORAGE_KEYS);
        if (chrome.runtime.lastError) {
            throw new Error(`Export Error: ${chrome.runtime.lastError.message}`);
        }
        const settingsJson = JSON.stringify(settings, null, FILE_CONFIG.JSON_INDENT_SPACES);
        const blob = new Blob([settingsJson], { type: FILE_CONFIG.MIME_TYPE });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const date = new Date();
        const timestamp = `${date.getFullYear()}${(date.getMonth() + DATE_FORMAT.MONTH_OFFSET).toString().padStart(DATE_FORMAT.PADDING_LENGTH, DATE_FORMAT.PADDING_CHAR)}${date.getDate().toString().padStart(DATE_FORMAT.PADDING_LENGTH, DATE_FORMAT.PADDING_CHAR)}`;
        a.download = `${FILE_CONFIG.EXPORT_FILENAME_PREFIX}${timestamp}${FILE_CONFIG.FILE_EXTENSION}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        console.log(USER_MESSAGES.EXPORT_SUCCESS_CONSOLE);
    } catch (error) {
        console.error("Error exporting settings:", error);
        alert(USER_MESSAGES.ERROR_EXPORTING);
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
            alert(USER_MESSAGES.ERROR_READING_FILE);
            return;
        }
        try {
            const importedSettings = JSON.parse(content);

            if (typeof importedSettings !== 'object' || importedSettings === null) {
                throw new Error(USER_MESSAGES.ERROR_INVALID_JSON);
            }

            if (!importedSettings[StorageKey.DashboardLayout]) {
                 console.warn("Imported settings might be incomplete or invalid (missing layout).");

            }

            await chrome.storage.local.set(importedSettings);
            if (chrome.runtime.lastError) {
                throw new Error(`Error saving imported settings: ${chrome.runtime.lastError.message}`);
            }
            console.log("Settings imported successfully.");
            alert(USER_MESSAGES.IMPORT_SUCCESS);

        } catch (error) {
            console.error("Error importing settings:", error);
            let message = USER_MESSAGES.ERROR_IMPORTING_PREFIX;
            if (error instanceof SyntaxError) {
                message += USER_MESSAGES.ERROR_INVALID_JSON;
            } else if (error instanceof Error) {
                message += error.message;
            } else {
                message += USER_MESSAGES.ERROR_UNKNOWN;
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
    console.log(LOG_MESSAGES.MOSAIC_BOARD_INITIALIZING);

    const modalManager = new ModalManager();

    const widgetLifecycleManager = new WidgetLifecycleManager();

    const settingsMenuManager = new SettingsMenuManager(modalManager, widgetLifecycleManager);

    widgetLifecycleManager.setSettingsMenuManager(settingsMenuManager);

    initGrid(DomSelector.GridContainer, () => {

        saveGridState();
    });

    widgetLifecycleManager.loadWidgets();

    const addWidgetButton = document.getElementById(DomSelector.AddWidgetButton);
    const addWidgetModal = document.getElementById(DomSelector.AddWidgetModal);
    const closeAddModalButton = addWidgetModal?.querySelector(`.${CssClass.ModalCloseButton}`);
    const widgetSelectionList = document.getElementById(DomSelector.WidgetSelectionList);

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

     const exportButton = document.getElementById(DomSelector.ExportSettingsButton);
     const importButton = document.getElementById(DomSelector.ImportSettingsButton);
     const importFileInput = document.getElementById(DomSelector.ImportFileInput);

     exportButton?.addEventListener('click', exportSettings);

     importButton?.addEventListener('click', () => importFileInput?.click());

     importFileInput?.addEventListener('change', handleImportFile);

    console.log(LOG_MESSAGES.MOSAIC_BOARD_INITIALIZED);
});

window.addEventListener('unload', () => {
    console.log(LOG_MESSAGES.MOSAIC_BOARD_UNLOADING);

});
