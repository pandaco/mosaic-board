import './styles/base.css';
import './styles/buttons.css';
import './styles/grid.css';
import './styles/widgets.css';
import './styles/modals.css';
import './styles/settings.css';
import 'gridstack/dist/gridstack.min.css';

import { initGrid, saveGridState } from './grid';
import { WidgetType } from './types';
import { ModalManager } from './modals/modal.manager';
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

function generateTimestamp(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + DATE_FORMAT.MONTH_OFFSET)
        .toString()
        .padStart(DATE_FORMAT.PADDING_LENGTH, DATE_FORMAT.PADDING_CHAR);
    const day = date.getDate()
        .toString()
        .padStart(DATE_FORMAT.PADDING_LENGTH, DATE_FORMAT.PADDING_CHAR);
    
    return `${year}${month}${day}`;
}

function generateExportFilename(): string {
    const timestamp = generateTimestamp(new Date());
    return `${FILE_CONFIG.EXPORT_FILENAME_PREFIX}${timestamp}${FILE_CONFIG.FILE_EXTENSION}`;
}

function createDownloadLink(blobUrl: string, filename: string): HTMLAnchorElement {
    const anchor = document.createElement('a');
    anchor.href = blobUrl;
    anchor.download = filename;
    return anchor;
}

function triggerDownload(anchor: HTMLAnchorElement): void {
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
}

function downloadBlob(blob: Blob, filename: string): void {
    const blobUrl = URL.createObjectURL(blob);
    const anchor = createDownloadLink(blobUrl, filename);
    triggerDownload(anchor);
    URL.revokeObjectURL(blobUrl);
}

async function exportSettings(): Promise<void> {
    try {
        const settings = await chrome.storage.local.get(EXPORTABLE_STORAGE_KEYS);
        if (chrome.runtime.lastError) {
            throw new Error(`Export Error: ${chrome.runtime.lastError.message}`);
        }

        const settingsJson = JSON.stringify(settings, null, FILE_CONFIG.JSON_INDENT_SPACES);
        const blob = new Blob([settingsJson], { type: FILE_CONFIG.MIME_TYPE });
        const filename = generateExportFilename();

        downloadBlob(blob, filename);
        console.log(USER_MESSAGES.EXPORT_SUCCESS_CONSOLE);
    } catch (error) {
        console.error("Error exporting settings:", error);
        alert(USER_MESSAGES.ERROR_EXPORTING);
    }
}

function validateImportedSettings(importedSettings: unknown): void {
    if (typeof importedSettings !== 'object' || importedSettings === null) {
        throw new Error(USER_MESSAGES.ERROR_INVALID_JSON);
    }

    const settings = importedSettings as Record<string, unknown>;
    if (!settings[StorageKey.DashboardLayout]) {
        console.warn("Imported settings might be incomplete or invalid (missing layout).");
    }
}

async function saveImportedSettings(importedSettings: Record<string, unknown>): Promise<void> {
    await chrome.storage.local.set(importedSettings);
    if (chrome.runtime.lastError) {
        throw new Error(`Error saving imported settings: ${chrome.runtime.lastError.message}`);
    }
}

function formatImportError(error: unknown): string {
    let message = USER_MESSAGES.ERROR_IMPORTING_PREFIX;

    if (error instanceof SyntaxError) {
        message += USER_MESSAGES.ERROR_INVALID_JSON;
    } else if (error instanceof Error) {
        message += error.message;
    } else {
        message += USER_MESSAGES.ERROR_UNKNOWN;
    }

    return message;
}

async function processImportedFile(content: string): Promise<void> {
    const importedSettings = JSON.parse(content);
    validateImportedSettings(importedSettings);
    await saveImportedSettings(importedSettings as Record<string, unknown>);
    console.log("Settings imported successfully.");
    alert(USER_MESSAGES.IMPORT_SUCCESS);
}

function handleImportFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    const reader = new FileReader();

    reader.onload = async (loadEvent) => {
        const content = loadEvent.target?.result;
        if (typeof content !== 'string') {
            alert(USER_MESSAGES.ERROR_READING_FILE);
            return;
        }

        try {
            await processImportedFile(content);
        } catch (error) {
            console.error("Error importing settings:", error);
            const message = formatImportError(error);
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

function setupModalCloseListeners(
    modalManager: ModalManager,
    addWidgetModal: HTMLElement | null
): void {
    const closeAddModalButton = addWidgetModal?.querySelector(`.${CssClass.ModalCloseButton}`);
    
    closeAddModalButton?.addEventListener('click', () => modalManager.closeActiveModal());

    addWidgetModal?.addEventListener('click', (event) => {
        if (event.target === addWidgetModal) {
            modalManager.closeActiveModal();
        }
    });
}

function setupWidgetSelection(
    modalManager: ModalManager,
    widgetLifecycleManager: WidgetLifecycleManager
): void {
    const widgetSelectionList = document.getElementById(DomSelector.WidgetSelectionList);

    widgetSelectionList?.addEventListener('click', (event) => {
        const target = event.target as HTMLElement;
        const listItem = target.closest<HTMLElement>('li[data-widget-type]');
        
        if (listItem && listItem.dataset.widgetType) {
            const widgetType = listItem.dataset.widgetType as WidgetType;
            widgetLifecycleManager.addWidget(widgetType);
            modalManager.closeActiveModal();
        }
    });
}

function setupAddWidgetModal(
    modalManager: ModalManager,
    widgetLifecycleManager: WidgetLifecycleManager
): void {
    const addWidgetButton = document.getElementById(DomSelector.AddWidgetButton);
    const addWidgetModal = document.getElementById(DomSelector.AddWidgetModal);

    addWidgetButton?.addEventListener('click', () => modalManager.openModal(addWidgetModal));
    
    setupModalCloseListeners(modalManager, addWidgetModal);
    setupWidgetSelection(modalManager, widgetLifecycleManager);
}

function setupImportExportButtons(): void {
    const exportButton = document.getElementById(DomSelector.ExportSettingsButton);
    const importButton = document.getElementById(DomSelector.ImportSettingsButton);
    const importFileInput = document.getElementById(DomSelector.ImportFileInput);

    exportButton?.addEventListener('click', exportSettings);
    importButton?.addEventListener('click', () => importFileInput?.click());
    importFileInput?.addEventListener('change', handleImportFile);
}

function initializeManagers(): { 
    modalManager: ModalManager; 
    widgetLifecycleManager: WidgetLifecycleManager; 
    settingsMenuManager: SettingsMenuManager;
} {
    const modalManager = new ModalManager();
    const widgetLifecycleManager = new WidgetLifecycleManager();
    const settingsMenuManager = new SettingsMenuManager(modalManager, widgetLifecycleManager);

    widgetLifecycleManager.setSettingsMenuManager(settingsMenuManager);

    return { modalManager, widgetLifecycleManager, settingsMenuManager };
}

document.addEventListener('DOMContentLoaded', () => {
    console.log(LOG_MESSAGES.MOSAIC_BOARD_INITIALIZING);

    const { modalManager, widgetLifecycleManager } = initializeManagers();

    initGrid(DomSelector.GridContainer, () => {
        saveGridState();
    });

    widgetLifecycleManager.loadWidgets();

    setupAddWidgetModal(modalManager, widgetLifecycleManager);
    setupImportExportButtons();

    console.log(LOG_MESSAGES.MOSAIC_BOARD_INITIALIZED);
});

window.addEventListener('unload', () => {
    console.log(LOG_MESSAGES.MOSAIC_BOARD_UNLOADING);

});
