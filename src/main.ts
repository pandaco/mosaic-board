import './main.css'; // Import global styles
import 'gridstack/dist/gridstack.min.css'; // Import Gridstack styles
// Removed unused 'getGridInstance'
import { initGrid, saveGridState } from './grid';
import { addWidget, loadWidgets, closeFolderSelectorModal, confirmFolderSelection } from './widget-manager';
import { WidgetType } from './types';

document.addEventListener('DOMContentLoaded', () => {
    console.log("Mosaic Board Initializing...");

    // Initialize Gridstack - removed unused 'grid' variable assignment
    initGrid('#grid-container', () => {
        // This callback is triggered on grid changes (drag, resize)
        saveGridState(); // Auto-save layout on change
    });

    // Load existing widgets and layout
    loadWidgets();

    // --- Event Listeners ---

    // Add Widget Button
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

    // Close modal when clicking background
    addWidgetModal?.addEventListener('click', (event) => {
        if (event.target === addWidgetModal) {
            addWidgetModal.classList.add('hidden');
        }
    });

    // Handle widget type selection
    widgetSelectionList?.addEventListener('click', (event) => {
        const target = event.target as HTMLElement;
        const listItem = target.closest<HTMLElement>('li[data-widget-type]');
        if (listItem && listItem.dataset.widgetType) {
            const type = listItem.dataset.widgetType as WidgetType;
            addWidget(type);
            addWidgetModal?.classList.add('hidden'); // Close modal after selection
        }
    });


    // Folder Selector Modal Buttons
    const folderSelectorModal = document.getElementById('folder-selector-modal');
    const closeFolderModalButton = folderSelectorModal?.querySelector('.modal-close-button');
    const cancelFolderButton = document.getElementById('cancel-folder-button');
    const confirmFolderButton = document.getElementById('confirm-folder-button');

    closeFolderModalButton?.addEventListener('click', closeFolderSelectorModal);
    cancelFolderButton?.addEventListener('click', closeFolderSelectorModal);
    confirmFolderButton?.addEventListener('click', confirmFolderSelection);

     // Close folder modal when clicking background
     folderSelectorModal?.addEventListener('click', (event) => {
         if (event.target === folderSelectorModal) {
             closeFolderSelectorModal();
         }
     });


    console.log("Mosaic Board Initialized.");
});

// Handle potential cleanup on unload (though less critical for newtab)
window.addEventListener('unload', () => {
    // Maybe save final state if needed, though 'change' event should cover most cases
    // saveGridState();
});
