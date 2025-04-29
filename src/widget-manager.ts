import { WidgetLayout, WidgetType, BaseWidgetPreferences } from './types';
import { addWidgetToGrid, removeWidgetFromGrid, saveGridState, loadGridState } from './grid';
import { deletePreferences, savePreferences, getWidgetPreferences } from './storage-service';
import { initBookmarkWidget, updateBookmarkWidgetPreferences } from './widgets/bookmark/bookmark-widget';
import { initWeatherWidget, updateWeatherWidgetPreferences } from './widgets/weather/weather-widget';
import { initClockWidget, updateClockWidgetPreferences, cleanupClockWidget } from './widgets/clock/clock-widget';

// Map widget types to their initialization functions
const widgetInitializers: { [key in WidgetType]?: (id: string, element: HTMLElement, prefs: any) => void } = {
    [WidgetType.Bookmarks]: initBookmarkWidget,
    [WidgetType.Weather]: initWeatherWidget,
    [WidgetType.Clock]: initClockWidget,
};

// Map widget types to their preference update functions
const widgetPreferenceUpdaters: { [key in WidgetType]?: (id: string, prefs: any) => void } = {
     [WidgetType.Bookmarks]: updateBookmarkWidgetPreferences,
     [WidgetType.Weather]: updateWeatherWidgetPreferences,
     [WidgetType.Clock]: updateClockWidgetPreferences,
};

// Map widget types to their cleanup functions (optional)
const widgetCleaners: { [key in WidgetType]?: (id: string) => void } = {
     [WidgetType.Clock]: cleanupClockWidget,
};


/**
 * Creates the main DOM element for a new widget.
 * @param id Unique ID for the widget instance.
 * @param type Type of the widget.
 * @returns The created HTMLElement (outer grid-stack-item) or null if template not found.
 */
function createWidgetElement(id: string, type: WidgetType): HTMLElement | null {
    const templateId = `${type}-widget-template`; // Uses enum value directly (e.g., 'bookmarks')
    const template = document.getElementById(templateId) as HTMLTemplateElement | null;

    if (!template) {
        console.error(`Template not found for widget type: ${type} (expected ID: ${templateId})`);
        return null;
    }

    const widgetContainer = document.createElement('div');
    widgetContainer.id = id;
    widgetContainer.dataset.widgetType = type;

    const contentFragment = template.content.cloneNode(true) as DocumentFragment;
    const widgetContentElement = contentFragment.querySelector('.grid-stack-item-content');

    if (!widgetContentElement) {
         console.error(`Template for ${type} is missing the .grid-stack-item-content element.`);
         return null;
    }

    widgetContainer.appendChild(contentFragment);

    const settingsButton = widgetContainer.querySelector('.widget-settings-button');
    if (settingsButton) {
        settingsButton.addEventListener('click', (event) => {
            event.stopPropagation();
            toggleWidgetSettingsMenu(id, type, settingsButton as HTMLElement);
        });
    }

    return widgetContainer;
}


/**
 * Adds a new widget of the specified type to the dashboard.
 * @param type The type of widget to add.
 */
export async function addWidget(type: WidgetType): Promise<void> {
    const id = `widget-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const widgetElement = createWidgetElement(id, type);

    if (widgetElement) {
        const contentElement = widgetElement.querySelector('.grid-stack-item-content') as HTMLElement | null;

        if (!contentElement) {
            console.error(`Could not find .grid-stack-item-content within the created element for ${type}`);
            return;
        }

        addWidgetToGrid(widgetElement, { w: 4, h: 3, id: id });

        const initializer = widgetInitializers[type];
        if (initializer) {
            const defaultPrefs = getDefaultPreferences(type);
            if (defaultPrefs) {
                 initializer(id, contentElement, defaultPrefs);
                 await savePreferences(id, type, defaultPrefs);
            } else {
                 console.warn(`No default preferences found for ${type}, cannot initialize or save.`);
                 initializer(id, contentElement, {});
            }

        } else {
            console.warn(`No initializer found for widget type: ${type}`);
        }

        saveGridState();
    }
}

/**
 * Removes a widget from the dashboard.
 * @param widgetId The ID of the widget instance to remove.
 */
export async function removeWidget(widgetId: string): Promise<void> {
    const widgetElement = document.getElementById(widgetId);
    if (widgetElement && widgetElement.dataset.widgetType) {
        const widgetType = widgetElement.dataset.widgetType as WidgetType;

        closeWidgetSettingsMenu();

        const cleaner = widgetCleaners[widgetType];
        if (cleaner) {
            try {
                cleaner(widgetId);
            } catch (error) {
                console.error(`Error cleaning up widget ${widgetId} of type ${widgetType}:`, error);
            }
        }

        removeWidgetFromGrid(widgetElement);
        await deletePreferences(widgetId, widgetType);
        saveGridState();

    } else {
        console.error(`Widget element not found or type missing for ID: ${widgetId}`);
    }
}

/**
 * Creates and toggles the display of the settings menu for a widget.
 * @param widgetId The ID of the widget instance.
 * @param widgetType The type of the widget.
 * @param buttonElement The settings button element that was clicked.
 */
async function toggleWidgetSettingsMenu(widgetId: string, widgetType: WidgetType, buttonElement: HTMLElement): Promise<void> {
    const existingMenu = document.getElementById('active-widget-settings-menu');
    const isOpeningDifferentMenu = !existingMenu || existingMenu.dataset.widgetId !== widgetId;

    closeWidgetSettingsMenu();

    if (!isOpeningDifferentMenu) {
        return;
    }

    const template = document.getElementById('widget-settings-menu-template') as HTMLTemplateElement;
    if (!template) {
        console.error("Widget settings menu template not found!");
        return;
    }

    const menuFragment = template.content.cloneNode(true) as DocumentFragment;
    const menuElement = menuFragment.querySelector('.widget-settings-menu') as HTMLElement | null;

    if (!menuElement) {
        console.error("'.widget-settings-menu' not found in template fragment!");
        return;
    }

    menuElement.id = 'active-widget-settings-menu';
    menuElement.dataset.widgetId = widgetId;

    const list = menuElement.querySelector('ul');
    if (!list) {
         console.error("UL element not found in settings menu!");
         return;
    }

    const deleteButton = menuElement.querySelector('.delete-widget-button');
     if (deleteButton) {
         deleteButton.addEventListener('click', (e) => {
             e.stopPropagation();
             // Changed confirmation message to English
             if (confirm('Are you sure you want to delete this widget?')) {
                 removeWidget(widgetId);
             }
         });
     } else {
         console.warn("Delete button not found in settings menu template.");
     }

    try {
        const prefs = await getWidgetPreferences<any>(widgetId, widgetType);
        addSpecificSettingsOptions(list, widgetId, widgetType, prefs);
    } catch (error) {
        console.error(`Error loading preferences for widget ${widgetId} to build settings menu:`, error);
    }

    document.body.appendChild(menuElement);

    const buttonRect = buttonElement.getBoundingClientRect();
    const menuRect = menuElement.getBoundingClientRect();

    let top = window.scrollY + buttonRect.bottom + 5;
    let left = window.scrollX + buttonRect.left;

    if (left + menuRect.width > window.innerWidth - 10) {
        left = window.scrollX + buttonRect.right - menuRect.width;
    }
    if (top + menuRect.height > window.innerHeight - 10) {
         top = window.scrollY + buttonRect.top - menuRect.height - 5;
    }
    if (left < 10) {
         left = 10;
     }

    menuElement.style.position = 'absolute';
    menuElement.style.top = `${top}px`;
    menuElement.style.left = `${left}px`;

     setTimeout(() => {
        document.addEventListener('click', handleOutsideClick, { capture: true, once: true });
        document.addEventListener('keydown', handleEscapeKey, { capture: true, once: true });
     }, 0);
}

/**
 * Adds widget-specific settings options to the menu list.
 * @param list The UL element of the settings menu.
 * @param widgetId The ID of the widget instance.
 * @param widgetType The type of the widget.
 * @param currentPrefs The current preferences for the widget.
 */
function addSpecificSettingsOptions(list: HTMLUListElement, widgetId: string, widgetType: WidgetType, currentPrefs: any | null): void {

    const deleteButtonLi = list.querySelector('.delete-widget-button')?.closest('li');

    let separatorAdded = false;
    const addSeparatorIfNeeded = () => {
        if (!separatorAdded) {
            const hr = document.createElement('hr');
            const li = document.createElement('li');
            li.appendChild(hr);
            list.insertBefore(li, deleteButtonLi ?? null);
            separatorAdded = true;
        }
    };

    switch (widgetType) {
        case WidgetType.Bookmarks:
            addSeparatorIfNeeded();
            addBookmarkSettings(list, widgetId, currentPrefs, deleteButtonLi ?? null);
            break;
        case WidgetType.Weather:
             addSeparatorIfNeeded();
            addWeatherSettings(list, widgetId, currentPrefs, deleteButtonLi ?? null);
            break;
        case WidgetType.Clock:
             addSeparatorIfNeeded();
            addClockSettings(list, widgetId, currentPrefs, deleteButtonLi ?? null);
            break;
        default:
             const _exhaustiveCheck: never = widgetType;
             console.warn(`No specific settings defined for widget type: ${_exhaustiveCheck}`);
             break;
    }
}

// --- Specific Settings Functions ---

function addBookmarkSettings(list: HTMLUListElement, widgetId: string, prefs: any, insertBeforeLi: HTMLLIElement | null): void {
    const currentView = prefs?.view || 'list';
    const showCount = prefs?.showCount ?? false;
    const defaultFolderId = prefs?.defaultFolderId || null;

    // Changed labels to English
    const viewGroupLi = createSettingsGroup(list, 'Display', insertBeforeLi);
    const listRadio = createRadioOption(widgetId, WidgetType.Bookmarks, 'view', 'list', 'List View', currentView === 'list');
    const gridRadio = createRadioOption(widgetId, WidgetType.Bookmarks, 'view', 'grid', 'Grid View', currentView === 'grid');
    viewGroupLi.appendChild(listRadio);
    viewGroupLi.appendChild(gridRadio);

    const countGroupLi = createSettingsGroup(list, 'Options', insertBeforeLi);
    const countCheckbox = createCheckboxOption(widgetId, WidgetType.Bookmarks, 'showCount', 'Show item count', showCount);
    countGroupLi.appendChild(countCheckbox);

    const folderGroupLi = createSettingsGroup(list, 'Default Folder', insertBeforeLi);
    const folderButton = document.createElement('button');
    folderButton.className = 'folder-setting-button settings-option';
    folderButton.innerHTML = `Select... <span class="current-folder-name">(Root)</span>`; // Changed text
    folderButton.addEventListener('click', (e) => {
        e.stopPropagation();
        openFolderSelectorModal(widgetId);
        closeWidgetSettingsMenu();
    });
    folderGroupLi.appendChild(folderButton);

    updateFolderButtonText(folderButton.querySelector('.current-folder-name') as HTMLElement, defaultFolderId);
}

function addWeatherSettings(list: HTMLUListElement, widgetId: string, prefs: any, insertBeforeLi: HTMLLIElement | null): void {
    const location = prefs?.location || '';
    const unit = prefs?.unit || 'metric';

    // Changed labels to English
    const locationGroupLi = createSettingsGroup(list, 'Location', insertBeforeLi);
    const locationInput = createTextInputOption(widgetId, WidgetType.Weather, 'location', 'Enter a city', location);
    locationGroupLi.appendChild(locationInput);

    const unitGroupLi = createSettingsGroup(list, 'Unit', insertBeforeLi);
    const unitSelect = createSelectOption(widgetId, WidgetType.Weather, 'unit', [
        { value: 'metric', text: 'Celsius (°C)' },
        { value: 'imperial', text: 'Fahrenheit (°F)' },
    ], unit);
    unitGroupLi.appendChild(unitSelect);
}

function addClockSettings(list: HTMLUListElement, widgetId: string, prefs: any, insertBeforeLi: HTMLLIElement | null): void {
     const showStopwatch = prefs?.showStopwatch ?? false;

     // Changed labels to English
     const stopwatchGroupLi = createSettingsGroup(list, 'Features', insertBeforeLi);
     const stopwatchCheckbox = createCheckboxOption(widgetId, WidgetType.Clock, 'showStopwatch', 'Show stopwatch', showStopwatch);
     stopwatchGroupLi.appendChild(stopwatchCheckbox);
}


// --- Helper functions for creating settings elements ---

function createSettingsGroup(list: HTMLUListElement, title: string, insertBeforeLi: HTMLLIElement | null): HTMLLIElement {
    const li = document.createElement('li');
    li.className = 'settings-group';
    const label = document.createElement('label');
    label.textContent = title; // Title is now passed in English
    li.appendChild(label);
    list.insertBefore(li, insertBeforeLi);
    return li;
}


function createRadioOption(widgetId: string, type: WidgetType, key: string, value: string, labelText: string, isChecked: boolean): HTMLLabelElement {
    const label = document.createElement('label');
    label.className = 'radio-group';
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = `${widgetId}-${key}`;
    radio.value = value;
    radio.checked = isChecked;
    radio.addEventListener('change', () => updatePreference(widgetId, type, key, value));
    label.appendChild(radio);
    label.appendChild(document.createTextNode(` ${labelText}`)); // labelText is now passed in English
    return label;
}

function createCheckboxOption(widgetId: string, type: WidgetType, key: string, labelText: string, isChecked: boolean): HTMLLabelElement {
    const label = document.createElement('label');
     label.className = 'checkbox-group';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = isChecked;
    checkbox.addEventListener('change', (e) => updatePreference(widgetId, type, key, (e.target as HTMLInputElement).checked));
    label.appendChild(checkbox);
    label.appendChild(document.createTextNode(` ${labelText}`)); // labelText is now passed in English
    return label;
}

function createTextInputOption(widgetId: string, type: WidgetType, key: string, placeholder: string, currentValue: string): HTMLInputElement {
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = placeholder; // placeholder is now passed in English
    input.value = currentValue;
    input.addEventListener('blur', (e) => updatePreference(widgetId, type, key, (e.target as HTMLInputElement).value));
     input.addEventListener('keydown', (e) => {
         if (e.key === 'Enter') {
             const targetInput = e.target as HTMLInputElement;
             updatePreference(widgetId, type, key, targetInput.value);
             targetInput.blur();
         }
     });
    return input;
}

function createSelectOption(widgetId: string, type: WidgetType, key: string, options: { value: string; text: string }[], currentValue: string): HTMLSelectElement {
    const select = document.createElement('select');
    options.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt.value;
        option.textContent = opt.text; // option text is now passed in English
        option.selected = opt.value === currentValue;
        select.appendChild(option);
    });
    select.addEventListener('change', (e) => updatePreference(widgetId, type, key, (e.target as HTMLSelectElement).value));
    return select;
}

/**
 * Generic function to update a widget's preference.
 */
async function updatePreference(widgetId: string, type: WidgetType, key: string, value: any): Promise<void> {
    try {
        const currentPrefs = await getWidgetPreferences<any>(widgetId, type) || getDefaultPreferences(type) || {};
        const newPrefs = { ...currentPrefs, [key]: value };
        await savePreferences(widgetId, type, newPrefs);

        const updater = widgetPreferenceUpdaters[type];
        if (updater) {
            updater(widgetId, newPrefs);
        } else {
            console.warn(`No preference updater function found for widget type: ${type}`);
        }

    } catch (error) {
        console.error(`Failed to update preference ${key} for widget ${widgetId}:`, error);
    }
}


/**
 * Closes the currently open widget settings menu, if any.
 */
function closeWidgetSettingsMenu(): void {
    const menu = document.getElementById('active-widget-settings-menu');
    if (menu) {
        document.removeEventListener('click', handleOutsideClick, { capture: true });
        document.removeEventListener('keydown', handleEscapeKey, { capture: true });
        menu.remove();
    }
}

/**
 * Event handler to close the menu when clicking outside of it.
 */
function handleOutsideClick(event: MouseEvent): void {
    const menu = document.getElementById('active-widget-settings-menu');
    const target = event.target as Node;

    if (menu && menu.contains(target)) {
         setTimeout(() => {
             document.removeEventListener('click', handleOutsideClick, { capture: true });
             document.addEventListener('click', handleOutsideClick, { capture: true, once: true });
         }, 0);
    } else {
        closeWidgetSettingsMenu();
    }
}
/**
 * Event handler to close the menu when the Escape key is pressed.
 */
function handleEscapeKey(event: KeyboardEvent): void {
     if (event.key === 'Escape') {
         closeWidgetSettingsMenu();
     } else {
         setTimeout(() => {
             const menu = document.getElementById('active-widget-settings-menu');
             if (menu) {
                 document.removeEventListener('keydown', handleEscapeKey, { capture: true });
                 document.addEventListener('keydown', handleEscapeKey, { capture: true, once: true });
             }
         }, 0);
     }
}


/**
 * Loads and creates all widgets based on the saved layout.
 */
export async function loadWidgets(): Promise<void> {
    await loadGridState(async (item: WidgetLayout): Promise<HTMLElement | null> => {
        const widgetContainer = createWidgetElement(item.id, item.type);
        if (widgetContainer) {
            const contentElement = widgetContainer.querySelector('.grid-stack-item-content') as HTMLElement | null;
            if (contentElement) {
                const initializer = widgetInitializers[item.type];
                if (initializer) {
                    try {
                        const prefs = await getWidgetPreferences<any>(item.id, item.type) || getDefaultPreferences(item.type);
                        if (prefs) {
                             initializer(item.id, contentElement, prefs);
                        } else {
                             console.warn(`Could not load or get default preferences for ${item.type} widget ${item.id}. Initializing with empty state.`);
                             initializer(item.id, contentElement, {});
                        }

                    } catch (error) {
                        console.error(`Error initializing widget ${item.id} of type ${item.type}:`, error);
                        contentElement.innerHTML = `<p class="error">Initialization error</p>`; // Changed text
                    }
                } else {
                    console.warn(`No initializer found for widget type: ${item.type}`);
                     contentElement.innerHTML = `<p class="error">Unknown widget type</p>`; // Changed text
                }
            } else {
                 console.error(`Could not find .grid-stack-item-content for loaded widget ${item.id}`);
                 return null;
            }
        }
        return widgetContainer;
    });
}


/**
 * Returns default preferences for a given widget type.
 */
function getDefaultPreferences(type: WidgetType): BaseWidgetPreferences | null {
    switch (type) {
        case WidgetType.Bookmarks:
            return { view: 'list', showCount: false, defaultFolderId: '1' };
        case WidgetType.Weather:
            return { location: 'Lille', unit: 'metric' }; // Keep Lille for now
        case WidgetType.Clock:
            return { showStopwatch: false };
        default:
             const _exhaustiveCheck: never = type;
             console.warn(`No default preferences defined for widget type: ${_exhaustiveCheck}`);
            return null;
    }
}

// --- Folder Selector Modal Logic ---

let currentWidgetIdForFolderSelection: string | null = null;

/**
 * Opens the folder selector modal and populates the tree.
 */
async function openFolderSelectorModal(widgetId: string): Promise<void> {
    currentWidgetIdForFolderSelection = widgetId;
    const modal = document.getElementById('folder-selector-modal');
    const treeContainer = document.getElementById('folder-tree-container');
    const confirmButton = document.getElementById('confirm-folder-button') as HTMLButtonElement;
    const selectedFolderNameSpan = document.getElementById('selected-folder-name');

    if (!modal || !treeContainer || !confirmButton || !selectedFolderNameSpan) {
        console.error("Folder selector modal elements not found.");
        return;
    }

    // Changed loading/default texts to English
    treeContainer.innerHTML = '<p>Loading folders...</p>';
    selectedFolderNameSpan.textContent = 'None';
    confirmButton.disabled = true;
    confirmButton.dataset.selectedFolderId = '';

    modal.classList.remove('hidden');

    try {
        const bookmarkTreeRoots = await chrome.bookmarks.getTree();
        treeContainer.innerHTML = '';

        if (bookmarkTreeRoots && bookmarkTreeRoots.length > 0 && bookmarkTreeRoots[0]) {
             const rootNode = bookmarkTreeRoots[0];
             const rootUl = document.createElement('ul');
             treeContainer.appendChild(rootUl);
             rootNode.children?.forEach(childNode => {
                 if (!childNode.url) {
                     buildFolderTree(childNode, rootUl, 0);
                 }
             });
        } else {
             treeContainer.innerHTML = '<p>No bookmark folders found.</p>'; // Changed text
        }

        treeContainer.removeEventListener('click', handleFolderTreeClick);
        treeContainer.addEventListener('click', handleFolderTreeClick);

    } catch (error) {
        console.error("Error loading bookmark tree:", error);
        treeContainer.innerHTML = '<p>Error loading folders.</p>'; // Changed text
    }
}

/**
 * Recursively builds the HTML for the folder tree.
 */
function buildFolderTree(node: chrome.bookmarks.BookmarkTreeNode, parentUlElement: HTMLUListElement, level: number): void {

    const li = document.createElement('li');
    const folderItem = document.createElement('div');
    folderItem.className = 'folder-item';
    folderItem.dataset.folderId = node.id;
    // Changed fallback text
    folderItem.dataset.folderName = node.title || `Folder ${node.id}`;

    const toggle = document.createElement('span');
    toggle.className = 'folder-toggle';
    toggle.setAttribute('aria-hidden', 'true');

    const icon = document.createElement('span');
    icon.className = 'folder-icon';
    icon.innerHTML = '<i class="fas fa-folder" aria-hidden="true"></i>';

    const title = document.createElement('span');
    title.className = 'folder-title';
    title.textContent = node.title || `Folder ${node.id}`; // Changed fallback text

    folderItem.appendChild(toggle);
    folderItem.appendChild(icon);
    folderItem.appendChild(title);
    li.appendChild(folderItem);

    const subFolders = node.children?.filter(child => !child.url) ?? [];

    if (subFolders.length > 0) {
        toggle.innerHTML = '<i class="fas fa-chevron-down" aria-hidden="true"></i>';
        toggle.dataset.state = 'expanded';
        toggle.removeAttribute('aria-hidden');
        folderItem.setAttribute('aria-expanded', 'true');

        const subUl = document.createElement('ul');
        subUl.setAttribute('role', 'group');
        subFolders.forEach(child => buildFolderTree(child, subUl, level + 1));
        li.appendChild(subUl);
    } else {
         toggle.innerHTML = '&nbsp;';
         toggle.dataset.state = 'leaf';
         folderItem.removeAttribute('aria-expanded');
    }

    parentUlElement.appendChild(li);
}


/**
 * Handles clicks within the folder tree container (event delegation).
 */
function handleFolderTreeClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const folderItem = target.closest<HTMLElement>('.folder-item');
    const toggleIcon = target.closest<HTMLElement>('.folder-toggle i');

    if (!folderItem) return;

    const treeContainer = document.getElementById('folder-tree-container');
    const confirmButton = document.getElementById('confirm-folder-button') as HTMLButtonElement;
    const selectedFolderNameSpan = document.getElementById('selected-folder-name');

    if (!treeContainer || !confirmButton || !selectedFolderNameSpan) return;

    const toggleSpan = folderItem.querySelector<HTMLElement>('.folder-toggle');
    if (toggleIcon && toggleSpan && toggleSpan.dataset.state !== 'leaf') {
        event.stopPropagation();
        const subUl = folderItem.nextElementSibling as HTMLUListElement | null;
        if (subUl) {
             const isExpanded = toggleSpan.dataset.state === 'expanded';
             subUl.classList.toggle('hidden', isExpanded);
             toggleSpan.dataset.state = isExpanded ? 'collapsed' : 'expanded';
             folderItem.setAttribute('aria-expanded', isExpanded ? 'false' : 'true');
             const icon = toggleSpan.querySelector('i');
             if (icon) {
                 icon.classList.toggle('fa-chevron-down', !isExpanded);
                 icon.classList.toggle('fa-chevron-right', isExpanded);
             }
        }
        return;
    }

    treeContainer.querySelectorAll('.folder-item.selected').forEach(el => el.classList.remove('selected'));
    folderItem.classList.add('selected');

    const folderId = folderItem.dataset.folderId;
    // Changed fallback text
    const folderName = folderItem.dataset.folderName || 'Selected folder';
    selectedFolderNameSpan.textContent = folderName;
    confirmButton.disabled = false;
    confirmButton.dataset.selectedFolderId = folderId;
}


/**
 * Closes the folder selector modal.
 */
export function closeFolderSelectorModal(): void {
    const modal = document.getElementById('folder-selector-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
    currentWidgetIdForFolderSelection = null;
}

/**
 * Handles the confirmation of folder selection.
 */
export async function confirmFolderSelection(): Promise<void> {
    const confirmButton = document.getElementById('confirm-folder-button') as HTMLButtonElement;
    const selectedFolderId = confirmButton?.dataset.selectedFolderId;

    if (selectedFolderId && currentWidgetIdForFolderSelection) {
        try {
            await updatePreference(currentWidgetIdForFolderSelection, WidgetType.Bookmarks, 'defaultFolderId', selectedFolderId);
            updateSettingsMenuFolderButton(currentWidgetIdForFolderSelection, selectedFolderId);
        } catch (error) {
             console.error("Error saving selected folder preference:", error);
        }
    } else {
         console.warn("No folder selected or widget ID missing for confirmation.");
    }
    closeFolderSelectorModal();
}

/**
 * Updates the text of the "Default Folder" button in the settings menu.
 */
async function updateSettingsMenuFolderButton(widgetId: string, folderId: string | null): Promise<void> {
    const menu = document.getElementById('active-widget-settings-menu');
    if (!menu || menu.dataset.widgetId !== widgetId) return;

    const folderButtonSpan = menu.querySelector<HTMLElement>('.folder-setting-button .current-folder-name');
    if (folderButtonSpan) {
        updateFolderButtonText(folderButtonSpan, folderId);
    }
}

/**
 * Helper to fetch folder name and update the button text. Now async.
 */
async function updateFolderButtonText(spanElement: HTMLElement | null, folderId: string | null): Promise<void> {
     if (!spanElement) return;

     // Changed default text
     let folderName = 'Root';
     if (folderId && folderId !== '0') {
         try {
             const nodes = await chrome.bookmarks.get(folderId);
             if (nodes && nodes.length > 0) {
                 // Changed fallback text
                 folderName = nodes[0].title || `Folder ${folderId}`;
             } else {
                  console.warn(`Folder with ID ${folderId} not found.`);
                  folderName = 'Unknown'; // Changed text
             }
         } catch (e) {
             console.warn(`Could not get folder name for ID: ${folderId}`, e);
             folderName = 'Error'; // Changed text
         }
     }
     spanElement.textContent = `(${folderName})`;
     spanElement.title = folderName;
}
