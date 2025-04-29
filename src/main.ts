import './main.css'; // Import global styles
import 'gridstack/dist/gridstack.min.css'; // Import Gridstack styles
import { initGrid, saveGridState } from './grid';
import { addWidget, loadWidgets, closeFolderSelectorModal, confirmFolderSelection } from './widget-manager';
import { WidgetType } from './types';

// Storage keys used by the extension
const STORAGE_KEYS = [
    'dashboardLayout',
    'bookmarkWidgetPrefs',
    'weatherWidgetPrefs',
    'clockWidgetPrefs'
    // Add other keys if new widget types are created
];

/**
 * Exports the current extension settings to a JSON file.
 */
async function exportSettings(): Promise<void> {
    try {
        // Get all relevant data from local storage
        const settings = await chrome.storage.local.get(STORAGE_KEYS);
        if (chrome.runtime.lastError) {
            console.error("Error retrieving settings for export:", chrome.runtime.lastError);
            // Changed alert message
            alert("Error retrieving settings for export.");
            return;
        }

        // Create a Blob containing the JSON data
        const settingsJson = JSON.stringify(settings, null, 4); // Indent for readability
        const blob = new Blob([settingsJson], { type: 'application/json' });

        // Create a URL for the Blob
        const url = URL.createObjectURL(blob);

        // Create a temporary download link
        const a = document.createElement('a');
        a.href = url;
        const date = new Date();
        const timestamp = `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}`;
        a.download = `mosaic_board_settings_${timestamp}.json`; // Filename

        // Simulate a click on the link to start the download
        document.body.appendChild(a); // Required for Firefox
        a.click();

        // Clean up the temporary link and URL
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        console.log("Settings exported successfully.");

    } catch (error) {
        console.error("Error exporting settings:", error);
        // Changed alert message
        alert("An error occurred while exporting settings.");
    }
}

/**
 * Handles the selection and import of a JSON settings file.
 * @param event - The change event from the file input.
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
            // Changed alert message
            alert("Error: Could not read file content.");
            return;
        }

        try {
            const importedSettings = JSON.parse(content);

            // --- Basic Validation ---
            if (typeof importedSettings !== 'object' || importedSettings === null) {
                // Changed error message
                throw new Error("The JSON file is invalid or empty.");
            }
            const hasKnownKey = STORAGE_KEYS.some(key => key in importedSettings);
            if (!hasKnownKey) {
                // Changed warning/error message
                console.warn("Imported JSON file does not seem to contain valid Mosaic Board settings.", importedSettings);
                // Could be stricter and throw an error:
                // throw new Error("File does not contain recognizable Mosaic Board settings.");
            }
            // --- End Validation ---

            // Optional: Clear old settings before import (destructive!)
            // await chrome.storage.local.clear();

            // Save the new settings (overwrites existing keys)
            await chrome.storage.local.set(importedSettings);
            if (chrome.runtime.lastError) {
                 console.error("Error saving imported settings:", chrome.runtime.lastError);
                 // Changed error message
                 throw new Error(`Error saving settings: ${chrome.runtime.lastError.message}`);
            }


            console.log("Settings imported successfully.", importedSettings);
            // Changed alert message
            alert("Settings imported successfully! Please reload the page (Ctrl+R or Cmd+R) to apply changes.");
            // Optional: Auto-reload (less safe if import partially fails)
            // window.location.reload();

        } catch (error) {
            console.error("Error importing settings:", error);
            // Changed alert message prefix
            let message = "Error importing settings: ";
            if (error instanceof SyntaxError) {
                // Changed error message
                message += "File is not valid JSON.";
            } else if (error instanceof Error) {
                message += error.message;
            } else {
                 // Changed error message
                 message += "Unknown error.";
            }
            alert(message);
        } finally {
            // Reset file input to allow importing the same file again if needed
            input.value = '';
        }
    };

    reader.onerror = () => {
        // Changed alert message
        alert(`Error reading file: ${reader.error}`);
         input.value = ''; // Reset
    };

    reader.readAsText(file);
}


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
        addWidgetModal?.classList.remove('hidden');
    });

    closeAddModalButton?.addEventListener('click', () => {
        addWidgetModal?.classList.add('hidden');
    });

    addWidgetModal?.addEventListener('click', (event) => {
        if (event.target === addWidgetModal) {
            addWidgetModal.classList.add('hidden');
        }
    });

    widgetSelectionList?.addEventListener('click', (event) => {
        const target = event.target as HTMLElement;
        const listItem = target.closest<HTMLElement>('li[data-widget-type]');
        if (listItem && listItem.dataset.widgetType) {
            const type = listItem.dataset.widgetType as WidgetType;
            addWidget(type);
            addWidgetModal?.classList.add('hidden');
        }
    });

    const folderSelectorModal = document.getElementById('folder-selector-modal');
    const closeFolderModalButton = folderSelectorModal?.querySelector('.modal-close-button');
    const cancelFolderButton = document.getElementById('cancel-folder-button');
    const confirmFolderButton = document.getElementById('confirm-folder-button');

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
