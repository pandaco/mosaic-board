// Updated CSS imports
import './styles/base.css';
import './styles/buttons.css';
import './styles/grid.css';
import './styles/widgets.css'; // Renamed from widgets-common.css
import './styles/modals.css';
import './styles/settings.css'; // Renamed from settings-menu.css
// --- End Update ---
import 'gridstack/dist/gridstack.min.css';
import { initGrid, saveGridState } from './grid';
import { addWidget, loadWidgets, closeFolderSelectorModal, confirmFolderSelection } from './widget-manager';
import { WidgetType } from './types';

const STORAGE_KEYS = [
    'dashboardLayout',
    'bookmarkWidgetPrefs',
    'weatherWidgetPrefs',
    'clockWidgetPrefs',
    'websiteEmbedWidgetPrefs'
];

/**
 * Exports the current extension settings to a JSON file.
 */
async function exportSettings(): Promise<void> {
    try {
        const settings = await chrome.storage.local.get(STORAGE_KEYS);
        if (chrome.runtime.lastError) {
            console.error("Error retrieving settings for export:", chrome.runtime.lastError);
            alert("Error retrieving settings for export.");
            return;
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
        alert("An error occurred while exporting settings.");
    }
}

/**
 * Handles the selection and import of a JSON settings file.
 */
function handleImportFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
        console.log("No file selected.");
        return;
    }

    const file = input.files[0];
    const reader = new FileReader();

    reader.onload = async (e) => {
        const content = e.target?.result;
        if (typeof content !== 'string') {
            alert("Error: Could not read file content.");
            return;
        }

        try {
            const importedSettings = JSON.parse(content);

            if (typeof importedSettings !== 'object' || importedSettings === null) {
                throw new Error("The JSON file is invalid or empty.");
            }
            const hasKnownKey = STORAGE_KEYS.some(key => key in importedSettings);
            if (!hasKnownKey) {
                console.warn("Imported JSON file does not seem to contain valid Mosaic Board settings.", importedSettings);
            }

            await chrome.storage.local.set(importedSettings);
            if (chrome.runtime.lastError) {
                 console.error("Error saving imported settings:", chrome.runtime.lastError);
                 throw new Error(`Error saving settings: ${chrome.runtime.lastError.message}`);
            }

            console.log("Settings imported successfully.", importedSettings);
            alert("Settings imported successfully! Please reload the page (Ctrl+R or Cmd+R) to apply changes.");

        } catch (error) {
            console.error("Error importing settings:", error);
            let message = "Error importing settings: ";
            if (error instanceof SyntaxError) {
                message += "File is not valid JSON.";
            } else if (error instanceof Error) {
                message += error.message;
            } else {
                 message += "Unknown error.";
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

// --- Modal Handling with ESC Key ---
let activeModalElement: HTMLElement | null = null;

const handleModalEscape = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && activeModalElement) {
        closeActiveModal();
    }
};

function openModal(modalElement: HTMLElement | null) {
    if (!modalElement) return;
    modalElement.classList.remove('hidden');
    activeModalElement = modalElement;
    document.addEventListener('keydown', handleModalEscape, { capture: true });
}

function closeActiveModal() {
    if (!activeModalElement) return;

    // Call specific close function for folder modal if needed
    if (activeModalElement.id === 'folder-selector-modal') {
         // Ensure the specific close function exists and call it
         if (typeof closeFolderSelectorModal === 'function') {
             closeFolderSelectorModal(); // This should handle setting activeModalElement to null
         } else {
              // Fallback if specific function not found (should not happen ideally)
              activeModalElement.classList.add('hidden');
              document.removeEventListener('keydown', handleModalEscape, { capture: true });
              activeModalElement = null;
         }
    } else {
        // Generic close for other modals
        activeModalElement.classList.add('hidden');
        document.removeEventListener('keydown', handleModalEscape, { capture: true });
        activeModalElement = null;
    }
}


// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("Mosaic Board Initializing...");

    initGrid('#grid-container', () => {
        saveGridState();
    });

    loadWidgets();

    // --- Event Listeners ---
    const addWidgetButton = document.getElementById('add-widget-button');
    const addWidgetModal = document.getElementById('add-widget-modal');
    const closeAddModalButton = addWidgetModal?.querySelector('.modal-close-button');
    const widgetSelectionList = document.getElementById('widget-selection-list');

    addWidgetButton?.addEventListener('click', () => {
        openModal(addWidgetModal);
    });

    closeAddModalButton?.addEventListener('click', closeActiveModal);

    addWidgetModal?.addEventListener('click', (event) => {
        if (event.target === addWidgetModal) {
            closeActiveModal();
        }
    });

    widgetSelectionList?.addEventListener('click', (event) => {
        const target = event.target as HTMLElement;
        const listItem = target.closest<HTMLElement>('li[data-widget-type]');
        if (listItem && listItem.dataset.widgetType) {
            const type = listItem.dataset.widgetType as WidgetType;
            addWidget(type);
            closeActiveModal();
        }
    });


    // Folder Selector Modal Buttons (Closing handled by specific functions or background click)
    const folderSelectorModal = document.getElementById('folder-selector-modal');
    const closeFolderModalButton = folderSelectorModal?.querySelector('.modal-close-button');
    const cancelFolderButton = document.getElementById('cancel-folder-button');
    const confirmFolderButton = document.getElementById('confirm-folder-button');

    // We still need specific handlers for Cancel/Confirm as they do more than just close
    closeFolderModalButton?.addEventListener('click', closeFolderSelectorModal);
    cancelFolderButton?.addEventListener('click', closeFolderSelectorModal);
    confirmFolderButton?.addEventListener('click', confirmFolderSelection);

     folderSelectorModal?.addEventListener('click', (event) => {
         if (event.target === folderSelectorModal) {
             closeFolderSelectorModal();
         }
     });

     // Import/Export Button Listeners
     const exportButton = document.getElementById('export-settings-button');
     const importButton = document.getElementById('import-settings-button');
     const importFileInput = document.getElementById('import-file-input');

     exportButton?.addEventListener('click', exportSettings);

     importButton?.addEventListener('click', () => {
         importFileInput?.click();
     });

     importFileInput?.addEventListener('change', handleImportFile);

    console.log("Mosaic Board Initialized.");
});

window.addEventListener('unload', () => {
    // Potential cleanup
});
