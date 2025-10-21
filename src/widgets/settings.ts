import { WidgetType } from '../types';
import { getWidgetPreferences } from '../storage.service';
import { getDefaultPreferences } from './factory';
import { ModalManager } from '../modals/modal.manager';
import { WidgetLifecycleManager } from './lifecycle';

export class SettingsMenuManager {
    private activeSettingsMenuElement: HTMLElement | null = null;
    private currentWidgetIdForFolderSelection: string | null = null;

    private modalManager: ModalManager;
    private lifecycleManager: WidgetLifecycleManager;

    private handleSettingsMenuEscape: (event: KeyboardEvent) => void;
    private handleSettingsMenuOutsideClick: (event: MouseEvent) => void;

    constructor(modalMgr: ModalManager, lifecycleMgr: WidgetLifecycleManager) {
        this.modalManager = modalMgr;
        this.lifecycleManager = lifecycleMgr;
        console.log("SettingsMenuManager initialized");

        this.handleSettingsMenuEscape = (event: KeyboardEvent) => {
             if (event.key === 'Escape' && this.activeSettingsMenuElement) {
                 this.closeWidgetSettingsMenu();
             }
        };

        this.handleSettingsMenuOutsideClick = (event: MouseEvent): void => {
            if (this.activeSettingsMenuElement && !this.activeSettingsMenuElement.contains(event.target as Node)) {

                const openerButtonId = this.activeSettingsMenuElement.dataset.openerButtonId;
                const openerButton = openerButtonId ? document.getElementById(openerButtonId) : null;

                if (!openerButton || !openerButton.contains(event.target as Node)) {

                     this.closeWidgetSettingsMenu();
                } else {

                     setTimeout(() => {
                         document.removeEventListener('click', this.handleSettingsMenuOutsideClick, { capture: true });
                         document.addEventListener('click', this.handleSettingsMenuOutsideClick, { capture: true, once: true });
                     }, 0);
                }
            } else if (this.activeSettingsMenuElement) {

                setTimeout(() => {
                    document.removeEventListener('click', this.handleSettingsMenuOutsideClick, { capture: true });
                    document.addEventListener('click', this.handleSettingsMenuOutsideClick, { capture: true, once: true });
                }, 0);
            }
        };

        this.setupFolderSelectorListeners();
    }

    async toggleWidgetSettingsMenu(widgetId: string, widgetType: WidgetType, buttonElement: HTMLElement): Promise<void> {
        console.log(`Toggling settings menu for widget ${widgetId}`);
        const isOpeningDifferentMenu = !this.activeSettingsMenuElement || this.activeSettingsMenuElement.dataset.widgetId !== widgetId;

        this.closeWidgetSettingsMenu();

        if (!isOpeningDifferentMenu) {
            console.log(`Settings menu for ${widgetId} was already open, now closed.`);
            return;
        }

        console.log(`Opening new settings menu for widget ${widgetId}`);
        const template = document.getElementById('widget-settings-menu-template') as HTMLTemplateElement;
        if (!template) {
            console.error('Widget settings menu template not found!');
            return;
        }
        const menuFragment = template.content.cloneNode(true) as DocumentFragment;
        const menuElement = menuFragment.querySelector('.widget-settings-menu') as HTMLElement | null;
        if (!menuElement) {
             console.error('Could not find .widget-settings-menu in template content!');
             return;
        }

        this.activeSettingsMenuElement = menuElement;
        this.activeSettingsMenuElement.id = `settings-menu-${widgetId}`;
        this.activeSettingsMenuElement.dataset.widgetId = widgetId;

        buttonElement.id = buttonElement.id || `settings-btn-${widgetId}`;
        this.activeSettingsMenuElement.dataset.openerButtonId = buttonElement.id;

        const list = this.activeSettingsMenuElement.querySelector('ul');
        if (!list) {
            console.error('Could not find ul element in settings menu template!');
            this.closeWidgetSettingsMenu();
            return;
        }

        const deleteButton = this.activeSettingsMenuElement.querySelector('.delete-widget-button');
        if (deleteButton) {
            deleteButton.addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm('Are you sure you want to delete this widget?')) {

                    this.lifecycleManager.removeWidget(widgetId);
                    this.closeWidgetSettingsMenu();
                }
            });
        }

        try {
            const prefs = await getWidgetPreferences<any>(widgetId, widgetType) || getDefaultPreferences(widgetType) || {};
            this.addSpecificSettingsOptions(list, widgetId, widgetType, prefs);
        } catch (error) {
            console.error(`Error loading preferences for widget ${widgetId}:`, error);

        }

        document.body.appendChild(this.activeSettingsMenuElement);
        this.positionMenu(this.activeSettingsMenuElement, buttonElement);

        setTimeout(() => {
            document.addEventListener('click', this.handleSettingsMenuOutsideClick, { capture: true, once: true });
            document.addEventListener('keydown', this.handleSettingsMenuEscape, { capture: true });
            console.log(`Settings menu for ${widgetId} opened and listeners attached.`);
        }, 0);
    }

    private positionMenu(menuElement: HTMLElement, buttonElement: HTMLElement): void {
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

         if (top < 10) {
            top = 10;
        }

        menuElement.style.position = 'absolute';
        menuElement.style.top = `${top}px`;
        menuElement.style.left = `${left}px`;
    }

    closeWidgetSettingsMenu(): void {
        if (this.activeSettingsMenuElement) {
             const widgetId = this.activeSettingsMenuElement.dataset.widgetId;
             console.log(`Closing settings menu for widget ${widgetId}`);
             this.activeSettingsMenuElement.remove();
             this.activeSettingsMenuElement = null;

             document.removeEventListener('click', this.handleSettingsMenuOutsideClick, { capture: true });
             document.removeEventListener('keydown', this.handleSettingsMenuEscape, { capture: true });
        }
    }

    closeWidgetSettingsMenuIfActive(widgetId: string): void {
        if (this.activeSettingsMenuElement && this.activeSettingsMenuElement.dataset.widgetId === widgetId) {
            this.closeWidgetSettingsMenu();
        }
    }

    isSettingsMenuOpenFor(widgetId: string): boolean {
        return !!this.activeSettingsMenuElement && this.activeSettingsMenuElement.dataset.widgetId === widgetId;
    }

    getActiveSettingsMenuElement(): HTMLElement | null {
        return this.activeSettingsMenuElement;
    }

    private addSpecificSettingsOptions(list: HTMLUListElement, widgetId: string, widgetType: WidgetType, currentPrefs: any | null): void {
        const deleteButtonLi = list.querySelector('.delete-widget-button')?.closest('li');
        let separatorAdded = false;
        const addSeparatorIfNeeded = () => {
            if (!separatorAdded) {
                const hr = document.createElement('hr'); const li = document.createElement('li'); li.appendChild(hr);
                list.insertBefore(li, deleteButtonLi ?? null); separatorAdded = true;
            }
        };
        switch (widgetType) {
            case WidgetType.Bookmarks: addSeparatorIfNeeded(); this.addBookmarkSettings(list, widgetId, currentPrefs, deleteButtonLi ?? null); break;
            case WidgetType.Weather: addSeparatorIfNeeded(); this.addWeatherSettings(list, widgetId, currentPrefs, deleteButtonLi ?? null); break;
            case WidgetType.Clock: addSeparatorIfNeeded(); this.addClockSettings(list, widgetId, currentPrefs, deleteButtonLi ?? null); break;
            case WidgetType.Website: addSeparatorIfNeeded(); this.addWebsiteSettings(list, widgetId, currentPrefs, deleteButtonLi ?? null); break;
            default:

                 const _exhaustiveCheck: never = widgetType;
                 console.warn(`No settings defined for widget type: ${_exhaustiveCheck}`);
                 break;
        }
    }

    private addBookmarkSettings(list: HTMLUListElement, widgetId: string, prefs: any, insertBeforeLi: HTMLLIElement | null): void {
        const currentView = prefs?.view || 'list';
        const showCount = prefs?.showCount ?? false;
        const defaultFolderId = prefs?.defaultFolderId || '1';
        const faviconSource = prefs?.faviconSource || 'default';

        const viewGroupLi = this.createSettingsGroup(list, 'Display', insertBeforeLi);
        viewGroupLi.appendChild(this.createRadioOption(widgetId, WidgetType.Bookmarks, 'view', 'list', 'List View', currentView === 'list'));
        viewGroupLi.appendChild(this.createRadioOption(widgetId, WidgetType.Bookmarks, 'view', 'grid', 'Grid View', currentView === 'grid'));

        const countGroupLi = this.createSettingsGroup(list, 'Options', insertBeforeLi);
        countGroupLi.appendChild(this.createCheckboxOption(widgetId, WidgetType.Bookmarks, 'showCount', 'Show item count', showCount));

        const faviconGroupLi = this.createSettingsGroup(list, 'Favicons', insertBeforeLi);
        faviconGroupLi.appendChild(this.createSelectOption(widgetId, WidgetType.Bookmarks, 'faviconSource', [
            { value: 'default', text: 'Default (Privacy-friendly)' },
            { value: 'google', text: 'Google Service' }
        ], faviconSource));

        const folderGroupLi = this.createSettingsGroup(list, 'Default Folder', insertBeforeLi);
        const folderButton = document.createElement('button');
        folderButton.className = 'folder-setting-button settings-option';

        folderButton.innerHTML = `Select... <span class="current-folder-name"></span>`;
        folderButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.openFolderSelectorModal(widgetId);
            this.closeWidgetSettingsMenu();
        });
        folderGroupLi.appendChild(folderButton);

        this.lifecycleManager.updateSettingsMenuFolderButtonText(widgetId, defaultFolderId);
    }

    private addWeatherSettings(list: HTMLUListElement, widgetId: string, prefs: any, insertBeforeLi: HTMLLIElement | null): void {
         const location = prefs?.location || '';
         const unit = prefs?.unit || 'metric';

         const locationGroupLi = this.createSettingsGroup(list, 'Location', insertBeforeLi);
         locationGroupLi.appendChild(this.createTextInputOption(widgetId, WidgetType.Weather, 'location', 'Enter a city', location));

         const unitGroupLi = this.createSettingsGroup(list, 'Unit', insertBeforeLi);
         unitGroupLi.appendChild(this.createSelectOption(widgetId, WidgetType.Weather, 'unit', [{ value: 'metric', text: 'Celsius (°C)' }, { value: 'imperial', text: 'Fahrenheit (°F)' }], unit));
    }

    private addClockSettings(list: HTMLUListElement, widgetId: string, prefs: any, insertBeforeLi: HTMLLIElement | null): void {
        const showStopwatch = prefs?.showStopwatch ?? false;
        const stopwatchGroupLi = this.createSettingsGroup(list, 'Features', insertBeforeLi);
        stopwatchGroupLi.appendChild(this.createCheckboxOption(widgetId, WidgetType.Clock, 'showStopwatch', 'Show stopwatch', showStopwatch));
    }

    private addWebsiteSettings(list: HTMLUListElement, widgetId: string, prefs: any, insertBeforeLi: HTMLLIElement | null): void {
        const url = prefs?.url || '';
        const refreshInterval = prefs?.refreshInterval || 0;
        const offsetTop = prefs?.offsetTop || 0;
        const offsetLeft = prefs?.offsetLeft || 0;

        const urlGroupLi = this.createSettingsGroup(list, 'Website URL', insertBeforeLi);
        urlGroupLi.appendChild(this.createTextInputOption(widgetId, WidgetType.Website, 'url', 'https://example.com', url, 'url'));

        const refreshGroupLi = this.createSettingsGroup(list, 'Refresh Interval', insertBeforeLi);
        refreshGroupLi.appendChild(this.createSelectOption(widgetId, WidgetType.Website, 'refreshInterval', [
             { value: '0', text: 'No Refresh' },
             { value: '5000', text: '5 seconds' },
             { value: '15000', text: '15 seconds' },
             { value: '30000', text: '30 seconds' },
             { value: '60000', text: '1 minute' },
             { value: '120000', text: '2 minutes' },
             { value: '300000', text: '5 minutes' },
             { value: '600000', text: '10 minutes' }
            ], refreshInterval.toString()));

        const offsetGroupLi = this.createSettingsGroup(list, 'Scroll Offset (px)', insertBeforeLi);
        const offsetContainer = document.createElement('div');
        offsetContainer.className = 'offset-inputs';
        const topLabel = document.createElement('label');
        topLabel.textContent = 'Top: ';
        topLabel.appendChild(this.createNumberInputOption(widgetId, WidgetType.Website, 'offsetTop', offsetTop));
        const leftLabel = document.createElement('label');
        leftLabel.textContent = ' Left: ';
        leftLabel.appendChild(this.createNumberInputOption(widgetId, WidgetType.Website, 'offsetLeft', offsetLeft));
        offsetContainer.appendChild(topLabel);
        offsetContainer.appendChild(leftLabel);
        offsetGroupLi.appendChild(offsetContainer);
    }

    private createSettingsGroup(list: HTMLUListElement, title: string, insertBeforeLi: HTMLLIElement | null): HTMLLIElement {
        const li = document.createElement('li');
        li.className = 'settings-group';
        const label = document.createElement('label');
        label.className = 'settings-group-title';
        label.textContent = title;
        li.appendChild(label);
        list.insertBefore(li, insertBeforeLi);
        return li;
    }

    private createRadioOption(widgetId: string, type: WidgetType, key: string, value: string, labelText: string, isChecked: boolean): HTMLLabelElement {
        const label = document.createElement('label');
        label.className = 'radio-group settings-option-item';
        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = `${widgetId}-${key}`;
        radio.value = value;
        radio.checked = isChecked;
        radio.addEventListener('change', () => this.lifecycleManager.updateWidgetPreference(widgetId, type, key, value));
        label.appendChild(radio);
        label.appendChild(document.createTextNode(` ${labelText}`));
        return label;
    }

    private createCheckboxOption(widgetId: string, type: WidgetType, key: string, labelText: string, isChecked: boolean): HTMLLabelElement {
        const label = document.createElement('label');
        label.className = 'checkbox-group settings-option-item';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = isChecked;
        checkbox.addEventListener('change', (e) => this.lifecycleManager.updateWidgetPreference(widgetId, type, key, (e.target as HTMLInputElement).checked));
        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(` ${labelText}`));
        return label;
    }

    private createTextInputOption(widgetId: string, type: WidgetType, key: string, placeholder: string, currentValue: string, inputType: string = 'text'): HTMLInputElement {
        const input = document.createElement('input');
        input.type = inputType;
        input.placeholder = placeholder;
        input.value = currentValue;
        input.className = 'settings-input';

        input.addEventListener('blur', (e) => this.lifecycleManager.updateWidgetPreference(widgetId, type, key, (e.target as HTMLInputElement).value));

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const targetInput = e.target as HTMLInputElement;
                this.lifecycleManager.updateWidgetPreference(widgetId, type, key, targetInput.value);
                targetInput.blur();
            }
        });
        return input;
    }
    private createNumberInputOption(widgetId: string, type: WidgetType, key: string, currentValue: number): HTMLInputElement {
        const input = document.createElement('input');
        input.type = 'number';
        input.value = currentValue.toString();
        input.min = '0';
        input.step = '1';
        input.className = 'settings-input number-input';
        input.addEventListener('change', (e) => {
            const value = parseInt((e.target as HTMLInputElement).value, 10);

            this.lifecycleManager.updateWidgetPreference(widgetId, type, key, isNaN(value) ? 0 : Math.max(0, value));
        });
         input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const targetInput = e.target as HTMLInputElement;
                 const value = parseInt(targetInput.value, 10);
                 this.lifecycleManager.updateWidgetPreference(widgetId, type, key, isNaN(value) ? 0 : Math.max(0, value));
                 targetInput.blur();
            }
        });
        return input;
    }

    private createSelectOption(widgetId: string, type: WidgetType, key: string, options: { value: string; text: string }[], currentValue: string): HTMLSelectElement {
        const select = document.createElement('select');
        select.className = 'settings-select';
        options.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.value;
            option.textContent = opt.text;
            option.selected = opt.value === currentValue;
            select.appendChild(option);
        });
        select.addEventListener('change', (e) => {
            const value = (e.target as HTMLSelectElement).value;

            const finalValue = (key === 'refreshInterval') ? parseInt(value, 10) : value;
            this.lifecycleManager.updateWidgetPreference(widgetId, type, key, finalValue);
        });
        return select;
    }

    private async openFolderSelectorModal(widgetId: string): Promise<void> {
        this.currentWidgetIdForFolderSelection = widgetId;
        const modal = document.getElementById('folder-selector-modal');
        const treeContainer = document.getElementById('folder-tree-container');
        const confirmButton = document.getElementById('confirm-folder-button') as HTMLButtonElement;
        const selectedFolderNameSpan = document.getElementById('selected-folder-name');

        if (!modal || !treeContainer || !confirmButton || !selectedFolderNameSpan) {
             console.error("Folder selector modal elements not found.");
             return;
        }

        treeContainer.innerHTML = '<p>Loading folders...</p>';
        selectedFolderNameSpan.textContent = 'None';
        confirmButton.disabled = true;
        confirmButton.dataset.selectedFolderId = '';

        this.modalManager.openModal(modal);

        try {
            const roots = await chrome.bookmarks.getTree();
            treeContainer.innerHTML = '';
            if (roots && roots.length > 0 && roots[0]) {
                const root = roots[0];
                const ul = document.createElement('ul');
                ul.setAttribute('role', 'tree');
                treeContainer.appendChild(ul);

                root.children?.forEach(child => {
                    if (!child.url) {
                        this.buildFolderTree(child, ul, 0);
                    }
                });
            } else {
                treeContainer.innerHTML = '<p>No bookmark folders found.</p>';
            }

            treeContainer.removeEventListener('click', this.handleFolderTreeClick);
            treeContainer.addEventListener('click', this.handleFolderTreeClick.bind(this));

        } catch (error) {
            console.error("Error loading bookmark tree:", error);
            treeContainer.innerHTML = '<p>Error loading folders.</p>';
        }
    }

    private buildFolderTree(node: chrome.bookmarks.BookmarkTreeNode, parentUl: HTMLUListElement, level: number): void {
        const li = document.createElement('li');
        li.setAttribute('role', 'treeitem');
        li.setAttribute('aria-level', (level + 1).toString());

        const folderItem = document.createElement('div');
        folderItem.className = 'folder-item';
        folderItem.dataset.folderId = node.id;
        const folderName = node.title || `Folder ${node.id}`;
        folderItem.dataset.folderName = folderName;
        folderItem.tabIndex = -1;

        const toggle = document.createElement('span');
        toggle.className = 'folder-toggle';
        toggle.setAttribute('aria-hidden', 'true');

        const icon = document.createElement('span');
        icon.className = 'folder-icon';
        icon.innerHTML = '<i class="fas fa-folder" aria-hidden="true"></i>';

        const title = document.createElement('span');
        title.className = 'folder-title';
        title.textContent = folderName;

        folderItem.appendChild(toggle);
        folderItem.appendChild(icon);
        folderItem.appendChild(title);
        li.appendChild(folderItem);

        const subFolders = node.children?.filter(child => !child.url) ?? [];

        if (subFolders.length > 0) {
            toggle.innerHTML = '<i class="fas fa-chevron-right" aria-hidden="true"></i>';
            toggle.dataset.state = 'collapsed';
            toggle.removeAttribute('aria-hidden');
            folderItem.setAttribute('aria-expanded', 'false');

            const subUl = document.createElement('ul');
            subUl.setAttribute('role', 'group');
            subUl.classList.add('hidden');
            subFolders.forEach(child => this.buildFolderTree(child, subUl, level + 1));
            li.appendChild(subUl);
        } else {
            toggle.innerHTML = '&nbsp;';
            toggle.dataset.state = 'leaf';
            folderItem.removeAttribute('aria-expanded');
            li.setAttribute('aria-expanded', 'false');
        }

        parentUl.appendChild(li);
    }

    private handleFolderTreeClick(event: MouseEvent): void {
        const target = event.target as HTMLElement;
        const folderItem = target.closest<HTMLElement>('.folder-item');

        if (!folderItem) return;

        const treeContainer = document.getElementById('folder-tree-container');
        const confirmButton = document.getElementById('confirm-folder-button') as HTMLButtonElement;
        const selectedFolderNameSpan = document.getElementById('selected-folder-name');

        if (!treeContainer || !confirmButton || !selectedFolderNameSpan) return;

        const toggleSpan = folderItem.querySelector<HTMLElement>('.folder-toggle');
        const isToggleClick = toggleSpan && toggleSpan.contains(target);

        if (isToggleClick && toggleSpan.dataset.state !== 'leaf') {
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
        folderItem.focus();

        const folderId = folderItem.dataset.folderId;
        const folderName = folderItem.dataset.folderName || 'Selected folder';
        selectedFolderNameSpan.textContent = folderName;
        confirmButton.disabled = false;
        confirmButton.dataset.selectedFolderId = folderId;
    }

    private async confirmFolderSelection(): Promise<void> {
        const confirmButton = document.getElementById('confirm-folder-button') as HTMLButtonElement;
        const selectedFolderId = confirmButton?.dataset.selectedFolderId;

        if (selectedFolderId && this.currentWidgetIdForFolderSelection) {
            console.log(`Confirming folder selection: ID ${selectedFolderId} for widget ${this.currentWidgetIdForFolderSelection}`);
            try {

                await this.lifecycleManager.updateWidgetPreference(
                    this.currentWidgetIdForFolderSelection,
                    WidgetType.Bookmarks,
                    'defaultFolderId',
                    selectedFolderId
                );

            } catch (error) {
                console.error("Error saving selected folder preference:", error);
                alert("Error saving folder preference. Check console.");
            }
        } else {
            console.warn("Confirm button clicked but no folder selected or widget ID missing.");
        }
        this.closeFolderSelectorModal();
    }

    private closeFolderSelectorModal(): void {
        this.modalManager.closeActiveModal();
        this.currentWidgetIdForFolderSelection = null;
    }

    private setupFolderSelectorListeners(): void {
        const modal = document.getElementById('folder-selector-modal');
        if (!modal) return;

        const closeButton = modal.querySelector('.modal-close-button');
        const cancelButton = document.getElementById('cancel-folder-button');
        const confirmButton = document.getElementById('confirm-folder-button');

        closeButton?.addEventListener('click', () => this.closeFolderSelectorModal());
        cancelButton?.addEventListener('click', () => this.closeFolderSelectorModal());
        confirmButton?.addEventListener('click', () => this.confirmFolderSelection());

        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                 this.closeFolderSelectorModal();
            }
        });
    }
}
