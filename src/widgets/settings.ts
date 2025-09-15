import { WidgetType } from '../types';
import { getWidgetPreferences } from '../storage-service';
import { getDefaultPreferences } from './factory';
import { ModalManager } from '../modals/modal';
import { WidgetLifecycleManager } from './lifecycle';

export class SettingsMenuManager {
    private activeSettingsMenuElement: HTMLElement | null = null;
    private currentWidgetIdForFolderSelection: string | null = null;
    // Correction: Utiliser l'instance injectée
    private modalManager: ModalManager;
    private lifecycleManager: WidgetLifecycleManager;

    private handleSettingsMenuEscape: (event: KeyboardEvent) => void;
    private handleSettingsMenuOutsideClick: (event: MouseEvent) => void;

    // Accepter les instances dans le constructeur
    constructor(modalMgr: ModalManager, lifecycleMgr: WidgetLifecycleManager) {
        this.modalManager = modalMgr;
        this.lifecycleManager = lifecycleMgr; // Stocker l'instance
        console.log("SettingsMenuManager initialized");

        // Définir les gestionnaires d'événements
        this.handleSettingsMenuEscape = (event: KeyboardEvent) => {
             if (event.key === 'Escape' && this.activeSettingsMenuElement) {
                 this.closeWidgetSettingsMenu();
             }
        };

        this.handleSettingsMenuOutsideClick = (event: MouseEvent): void => {
            if (this.activeSettingsMenuElement && !this.activeSettingsMenuElement.contains(event.target as Node)) {
                // Vérifier si le clic n'est pas sur le bouton qui a ouvert le menu
                const openerButtonId = this.activeSettingsMenuElement.dataset.openerButtonId;
                const openerButton = openerButtonId ? document.getElementById(openerButtonId) : null;

                if (!openerButton || !openerButton.contains(event.target as Node)) {
                    // Si le clic est en dehors du menu ET du bouton d'ouverture, fermer le menu
                     this.closeWidgetSettingsMenu();
                } else {
                    // Si le clic est sur le bouton d'ouverture (pour le refermer),
                    // réattacher le listener 'once' pour la prochaine interaction
                     setTimeout(() => {
                         document.removeEventListener('click', this.handleSettingsMenuOutsideClick, { capture: true });
                         document.addEventListener('click', this.handleSettingsMenuOutsideClick, { capture: true, once: true });
                     }, 0);
                }
            } else if (this.activeSettingsMenuElement) {
                // Si le clic est à l'intérieur du menu, réattacher le listener 'once'
                setTimeout(() => {
                    document.removeEventListener('click', this.handleSettingsMenuOutsideClick, { capture: true });
                    document.addEventListener('click', this.handleSettingsMenuOutsideClick, { capture: true, once: true });
                }, 0);
            }
        };

        // Configurer les listeners pour la modale de sélection de dossier
        this.setupFolderSelectorListeners();
    }

    // --- Logique du Menu des Paramètres ---

    async toggleWidgetSettingsMenu(widgetId: string, widgetType: WidgetType, buttonElement: HTMLElement): Promise<void> {
        console.log(`Toggling settings menu for widget ${widgetId}`);
        const isOpeningDifferentMenu = !this.activeSettingsMenuElement || this.activeSettingsMenuElement.dataset.widgetId !== widgetId;

        // Fermer le menu actuel (s'il y en a un)
        this.closeWidgetSettingsMenu();

        // Si on cliquait sur le bouton du menu déjà ouvert, on le ferme simplement (fait ci-dessus)
        if (!isOpeningDifferentMenu) {
            console.log(`Settings menu for ${widgetId} was already open, now closed.`);
            return;
        }

        // Créer et afficher le nouveau menu
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
        this.activeSettingsMenuElement.id = `settings-menu-${widgetId}`; // ID plus spécifique
        this.activeSettingsMenuElement.dataset.widgetId = widgetId;

        // Stocker l'ID du bouton qui a ouvert le menu pour la gestion des clics extérieurs
        buttonElement.id = buttonElement.id || `settings-btn-${widgetId}`; // Assurer un ID au bouton
        this.activeSettingsMenuElement.dataset.openerButtonId = buttonElement.id;


        const list = this.activeSettingsMenuElement.querySelector('ul');
        if (!list) {
            console.error('Could not find ul element in settings menu template!');
            this.closeWidgetSettingsMenu(); // Nettoyer si le template est invalide
            return;
        }

        // Configurer le bouton de suppression
        const deleteButton = this.activeSettingsMenuElement.querySelector('.delete-widget-button');
        if (deleteButton) {
            deleteButton.addEventListener('click', (e) => {
                e.stopPropagation(); // Empêcher la fermeture immédiate par le listener outsideClick
                if (confirm('Are you sure you want to delete this widget?')) {
                    // Utiliser l'instance injectée de WidgetLifecycleManager
                    this.lifecycleManager.removeWidget(widgetId);
                    this.closeWidgetSettingsMenu(); // Fermer le menu après confirmation
                }
            });
        }

        // Charger les préférences et ajouter les options spécifiques
        try {
            const prefs = await getWidgetPreferences<any>(widgetId, widgetType) || getDefaultPreferences(widgetType) || {};
            this.addSpecificSettingsOptions(list, widgetId, widgetType, prefs);
        } catch (error) {
            console.error(`Error loading preferences for widget ${widgetId}:`, error);
            // Afficher une erreur dans le menu ? Pour l'instant, log seulement.
        }

        // Ajouter le menu au DOM et le positionner
        document.body.appendChild(this.activeSettingsMenuElement);
        this.positionMenu(this.activeSettingsMenuElement, buttonElement);

        // Ajouter les listeners pour fermer le menu (après un court délai pour éviter fermeture immédiate)
        setTimeout(() => {
            document.addEventListener('click', this.handleSettingsMenuOutsideClick, { capture: true, once: true });
            document.addEventListener('keydown', this.handleSettingsMenuEscape, { capture: true });
            console.log(`Settings menu for ${widgetId} opened and listeners attached.`);
        }, 0);
    }

    // Positionne le menu par rapport au bouton
    private positionMenu(menuElement: HTMLElement, buttonElement: HTMLElement): void {
        const buttonRect = buttonElement.getBoundingClientRect();
        const menuRect = menuElement.getBoundingClientRect(); // Mesurer après ajout au DOM (ou avec visibilité temporaire)

        // Positionnement initial (en dessous, aligné à gauche)
        let top = window.scrollY + buttonRect.bottom + 5;
        let left = window.scrollX + buttonRect.left;

        // Ajuster si dépasse à droite
        if (left + menuRect.width > window.innerWidth - 10) {
            left = window.scrollX + buttonRect.right - menuRect.width;
        }
        // Ajuster si dépasse en bas (placer au-dessus)
        if (top + menuRect.height > window.innerHeight - 10) {
            top = window.scrollY + buttonRect.top - menuRect.height - 5;
        }
        // Ajuster si dépasse à gauche (rare, mais sécurité)
        if (left < 10) {
            left = 10;
        }
        // Ajuster si dépasse en haut (rare, mais sécurité)
         if (top < 10) {
            top = 10;
        }


        menuElement.style.position = 'absolute';
        menuElement.style.top = `${top}px`;
        menuElement.style.left = `${left}px`;
    }

    // Ferme le menu des paramètres actif
    closeWidgetSettingsMenu(): void {
        if (this.activeSettingsMenuElement) {
             const widgetId = this.activeSettingsMenuElement.dataset.widgetId;
             console.log(`Closing settings menu for widget ${widgetId}`);
             this.activeSettingsMenuElement.remove();
             this.activeSettingsMenuElement = null;
             // Nettoyer les listeners globaux
             document.removeEventListener('click', this.handleSettingsMenuOutsideClick, { capture: true });
             document.removeEventListener('keydown', this.handleSettingsMenuEscape, { capture: true });
        }
    }

    // --- NOUVELLES MÉTHODES ---
    /**
     * Ferme le menu des paramètres s'il est ouvert pour le widget spécifié.
     */
    closeWidgetSettingsMenuIfActive(widgetId: string): void {
        if (this.activeSettingsMenuElement && this.activeSettingsMenuElement.dataset.widgetId === widgetId) {
            this.closeWidgetSettingsMenu();
        }
    }

    /**
     * Vérifie si le menu des paramètres est actuellement ouvert pour un widget spécifique.
     */
    isSettingsMenuOpenFor(widgetId: string): boolean {
        return !!this.activeSettingsMenuElement && this.activeSettingsMenuElement.dataset.widgetId === widgetId;
    }

    /**
     * Retourne l'élément DOM du menu des paramètres actif.
     */
    getActiveSettingsMenuElement(): HTMLElement | null {
        return this.activeSettingsMenuElement;
    }
    // --- FIN DES NOUVELLES MÉTHODES ---


    // Ajoute les options spécifiques au type de widget
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
                 // Gestion exhaustive pour s'assurer que tous les types sont traités
                 const _exhaustiveCheck: never = widgetType;
                 console.warn(`No settings defined for widget type: ${_exhaustiveCheck}`);
                 break;
        }
    }

    // --- Fonctions spécifiques aux paramètres de chaque widget ---
    private addBookmarkSettings(list: HTMLUListElement, widgetId: string, prefs: any, insertBeforeLi: HTMLLIElement | null): void {
        const currentView = prefs?.view || 'list';
        const showCount = prefs?.showCount ?? false;
        const defaultFolderId = prefs?.defaultFolderId || '1'; // Utiliser '1' par défaut

        // Groupe pour la vue (Liste/Grille)
        const viewGroupLi = this.createSettingsGroup(list, 'Display', insertBeforeLi);
        viewGroupLi.appendChild(this.createRadioOption(widgetId, WidgetType.Bookmarks, 'view', 'list', 'List View', currentView === 'list'));
        viewGroupLi.appendChild(this.createRadioOption(widgetId, WidgetType.Bookmarks, 'view', 'grid', 'Grid View', currentView === 'grid'));

        // Groupe pour les options (Afficher le compteur)
        const countGroupLi = this.createSettingsGroup(list, 'Options', insertBeforeLi);
        countGroupLi.appendChild(this.createCheckboxOption(widgetId, WidgetType.Bookmarks, 'showCount', 'Show item count', showCount));

        // Groupe pour le dossier par défaut
        const folderGroupLi = this.createSettingsGroup(list, 'Default Folder', insertBeforeLi);
        const folderButton = document.createElement('button');
        folderButton.className = 'folder-setting-button settings-option';
        // Le span sera mis à jour par updateSettingsMenuFolderButtonText
        folderButton.innerHTML = `Select... <span class="current-folder-name"></span>`;
        folderButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.openFolderSelectorModal(widgetId); // Ouvre la modale de sélection
            this.closeWidgetSettingsMenu(); // Ferme le menu des paramètres
        });
        folderGroupLi.appendChild(folderButton);

        // Mettre à jour le texte du bouton immédiatement avec la valeur actuelle
        // Utiliser la méthode de lifecycleManager qui est maintenant une dépendance
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

    // --- Fonctions d'aide pour créer les éléments de formulaire ---
    private createSettingsGroup(list: HTMLUListElement, title: string, insertBeforeLi: HTMLLIElement | null): HTMLLIElement {
        const li = document.createElement('li');
        li.className = 'settings-group';
        const label = document.createElement('label');
        label.className = 'settings-group-title'; // Classe ajoutée pour stylisation potentielle
        label.textContent = title;
        li.appendChild(label);
        list.insertBefore(li, insertBeforeLi); // Insérer avant le bouton supprimer ou à la fin
        return li;
    }

    private createRadioOption(widgetId: string, type: WidgetType, key: string, value: string, labelText: string, isChecked: boolean): HTMLLabelElement {
        const label = document.createElement('label');
        label.className = 'radio-group settings-option-item'; // Classe ajoutée
        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = `${widgetId}-${key}`; // Assurer un groupe unique par widget et clé
        radio.value = value;
        radio.checked = isChecked;
        radio.addEventListener('change', () => this.lifecycleManager.updateWidgetPreference(widgetId, type, key, value));
        label.appendChild(radio);
        label.appendChild(document.createTextNode(` ${labelText}`));
        return label;
    }

    private createCheckboxOption(widgetId: string, type: WidgetType, key: string, labelText: string, isChecked: boolean): HTMLLabelElement {
        const label = document.createElement('label');
        label.className = 'checkbox-group settings-option-item'; // Classe ajoutée
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
        input.className = 'settings-input'; // Classe ajoutée
        // Mettre à jour en perdant le focus
        input.addEventListener('blur', (e) => this.lifecycleManager.updateWidgetPreference(widgetId, type, key, (e.target as HTMLInputElement).value));
        // Mettre à jour aussi en appuyant sur Entrée
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const targetInput = e.target as HTMLInputElement;
                this.lifecycleManager.updateWidgetPreference(widgetId, type, key, targetInput.value);
                targetInput.blur(); // Optionnel: retirer le focus après Entrée
            }
        });
        return input;
    }
    private createNumberInputOption(widgetId: string, type: WidgetType, key: string, currentValue: number): HTMLInputElement {
        const input = document.createElement('input');
        input.type = 'number';
        input.value = currentValue.toString();
        input.min = '0'; // Assurer un minimum
        input.step = '1'; // Pas d'incrément
        input.className = 'settings-input number-input'; // Classes ajoutées
        input.addEventListener('change', (e) => { // Utiliser change plutôt que blur pour les number inputs
            const value = parseInt((e.target as HTMLInputElement).value, 10);
            // Mettre à jour seulement si c'est un nombre valide, sinon remettre à 0 ou l'ancienne valeur? Ici 0.
            this.lifecycleManager.updateWidgetPreference(widgetId, type, key, isNaN(value) ? 0 : Math.max(0, value)); // Assurer >= 0
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
        select.className = 'settings-select'; // Classe ajoutée
        options.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.value;
            option.textContent = opt.text;
            option.selected = opt.value === currentValue; // Comparaison directe
            select.appendChild(option);
        });
        select.addEventListener('change', (e) => {
            const value = (e.target as HTMLSelectElement).value;
            // Convertir en nombre si c'est pour refreshInterval
            const finalValue = (key === 'refreshInterval') ? parseInt(value, 10) : value;
            this.lifecycleManager.updateWidgetPreference(widgetId, type, key, finalValue);
        });
        return select;
    }

    // --- Logique du Sélecteur de Dossier ---
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

        // Réinitialiser l'état de la modale
        treeContainer.innerHTML = '<p>Loading folders...</p>';
        selectedFolderNameSpan.textContent = 'None';
        confirmButton.disabled = true;
        confirmButton.dataset.selectedFolderId = '';

        this.modalManager.openModal(modal); // Utiliser l'instance injectée

        // Construire l'arbre des favoris
        try {
            const roots = await chrome.bookmarks.getTree();
            treeContainer.innerHTML = ''; // Nettoyer le message de chargement
            if (roots && roots.length > 0 && roots[0]) {
                const root = roots[0]; // L'arbre entier
                const ul = document.createElement('ul');
                ul.setAttribute('role', 'tree'); // Rôle ARIA pour l'arbre
                treeContainer.appendChild(ul);
                // Afficher les enfants directs de la racine (Barre personnelle, Autres favoris, etc.)
                root.children?.forEach(child => {
                    if (!child.url) { // Ne traiter que les dossiers
                        this.buildFolderTree(child, ul, 0);
                    }
                });
            } else {
                treeContainer.innerHTML = '<p>No bookmark folders found.</p>';
            }
            // Attacher le listener d'événements une seule fois après la construction
            treeContainer.removeEventListener('click', this.handleFolderTreeClick); // Assurer qu'il n'y a pas de doublons
            treeContainer.addEventListener('click', this.handleFolderTreeClick.bind(this));

        } catch (error) {
            console.error("Error loading bookmark tree:", error);
            treeContainer.innerHTML = '<p>Error loading folders.</p>';
        }
    }

    // Construit récursivement l'arbre des dossiers pour la modale
    private buildFolderTree(node: chrome.bookmarks.BookmarkTreeNode, parentUl: HTMLUListElement, level: number): void {
        const li = document.createElement('li');
        li.setAttribute('role', 'treeitem');
        li.setAttribute('aria-level', (level + 1).toString()); // Niveau ARIA

        const folderItem = document.createElement('div');
        folderItem.className = 'folder-item';
        folderItem.dataset.folderId = node.id;
        const folderName = node.title || `Folder ${node.id}`;
        folderItem.dataset.folderName = folderName;
        folderItem.tabIndex = -1; // Pour la navigation clavier potentielle

        const toggle = document.createElement('span');
        toggle.className = 'folder-toggle';
        toggle.setAttribute('aria-hidden', 'true'); // Icon décoratif

        const icon = document.createElement('span');
        icon.className = 'folder-icon';
        icon.innerHTML = '<i class="fas fa-folder" aria-hidden="true"></i>'; // Icône FontAwesome

        const title = document.createElement('span');
        title.className = 'folder-title';
        title.textContent = folderName;

        folderItem.appendChild(toggle);
        folderItem.appendChild(icon);
        folderItem.appendChild(title);
        li.appendChild(folderItem);

        // Vérifier s'il y a des sous-dossiers
        const subFolders = node.children?.filter(child => !child.url) ?? [];

        if (subFolders.length > 0) {
            toggle.innerHTML = '<i class="fas fa-chevron-right" aria-hidden="true"></i>'; // Commencer fermé
            toggle.dataset.state = 'collapsed';
            toggle.removeAttribute('aria-hidden'); // Le toggle est interactif
            folderItem.setAttribute('aria-expanded', 'false'); // Commencer fermé

            const subUl = document.createElement('ul');
            subUl.setAttribute('role', 'group'); // Groupe de sous-éléments
            subUl.classList.add('hidden'); // Cacher par défaut
            subFolders.forEach(child => this.buildFolderTree(child, subUl, level + 1));
            li.appendChild(subUl);
        } else {
            toggle.innerHTML = '&nbsp;'; // Espace pour alignement si pas d'enfants
            toggle.dataset.state = 'leaf'; // C'est une feuille
            folderItem.removeAttribute('aria-expanded'); // Pas d'attribut expanded pour les feuilles
            li.setAttribute('aria-expanded', 'false'); // ARIA pour les feuilles
        }

        parentUl.appendChild(li);
    }

    // Gère les clics dans l'arbre des dossiers (sélection et déploiement/repli)
    private handleFolderTreeClick(event: MouseEvent): void {
        const target = event.target as HTMLElement;
        const folderItem = target.closest<HTMLElement>('.folder-item');

        if (!folderItem) return; // Clic en dehors d'un item

        const treeContainer = document.getElementById('folder-tree-container');
        const confirmButton = document.getElementById('confirm-folder-button') as HTMLButtonElement;
        const selectedFolderNameSpan = document.getElementById('selected-folder-name');

        if (!treeContainer || !confirmButton || !selectedFolderNameSpan) return; // Éléments UI manquants

        // Gestion du clic sur l'icône de déploiement/repli
        const toggleSpan = folderItem.querySelector<HTMLElement>('.folder-toggle');
        const isToggleClick = toggleSpan && toggleSpan.contains(target); // Clic sur le span ou son icône

        if (isToggleClick && toggleSpan.dataset.state !== 'leaf') {
            event.stopPropagation(); // Empêcher la sélection si on clique sur le toggle
            const subUl = folderItem.nextElementSibling as HTMLUListElement | null;
            if (subUl) {
                const isExpanded = toggleSpan.dataset.state === 'expanded';
                subUl.classList.toggle('hidden', isExpanded); // Inverse la visibilité
                toggleSpan.dataset.state = isExpanded ? 'collapsed' : 'expanded'; // Met à jour l'état
                folderItem.setAttribute('aria-expanded', isExpanded ? 'false' : 'true'); // Met à jour ARIA
                const icon = toggleSpan.querySelector('i');
                if (icon) {
                    icon.classList.toggle('fa-chevron-down', !isExpanded); // Icône ouvert
                    icon.classList.toggle('fa-chevron-right', isExpanded); // Icône fermé
                }
            }
            return; // Ne pas sélectionner le dossier si on clique sur le toggle
        }

        // Gestion du clic sur le dossier lui-même (pour sélection)
        // Retirer la classe 'selected' de l'ancien élément sélectionné
        treeContainer.querySelectorAll('.folder-item.selected').forEach(el => el.classList.remove('selected'));
        // Ajouter la classe 'selected' au nouvel élément
        folderItem.classList.add('selected');
        folderItem.focus(); // Mettre le focus pour l'accessibilité

        // Mettre à jour l'UI avec le dossier sélectionné
        const folderId = folderItem.dataset.folderId;
        const folderName = folderItem.dataset.folderName || 'Selected folder';
        selectedFolderNameSpan.textContent = folderName;
        confirmButton.disabled = false; // Activer le bouton de confirmation
        confirmButton.dataset.selectedFolderId = folderId; // Stocker l'ID sélectionné
    }


    // Confirme la sélection du dossier et met à jour les préférences
    private async confirmFolderSelection(): Promise<void> {
        const confirmButton = document.getElementById('confirm-folder-button') as HTMLButtonElement;
        const selectedFolderId = confirmButton?.dataset.selectedFolderId;

        if (selectedFolderId && this.currentWidgetIdForFolderSelection) {
            console.log(`Confirming folder selection: ID ${selectedFolderId} for widget ${this.currentWidgetIdForFolderSelection}`);
            try {
                // Utiliser lifecycleManager pour mettre à jour la préférence
                await this.lifecycleManager.updateWidgetPreference(
                    this.currentWidgetIdForFolderSelection,
                    WidgetType.Bookmarks,
                    'defaultFolderId',
                    selectedFolderId
                );
                // Pas besoin de mettre à jour le bouton ici, updateWidgetPreference le fera via l'updater du widget
            } catch (error) {
                console.error("Error saving selected folder preference:", error);
                alert("Error saving folder preference. Check console.");
            }
        } else {
            console.warn("Confirm button clicked but no folder selected or widget ID missing.");
        }
        this.closeFolderSelectorModal(); // Fermer la modale dans tous les cas
    }

    // Ferme la modale de sélection de dossier
    private closeFolderSelectorModal(): void {
        this.modalManager.closeActiveModal(); // Utiliser ModalManager
        this.currentWidgetIdForFolderSelection = null; // Réinitialiser l'ID du widget en cours
    }

    // Attache les listeners aux boutons de la modale de sélection de dossier
    private setupFolderSelectorListeners(): void {
        const modal = document.getElementById('folder-selector-modal');
        if (!modal) return;

        const closeButton = modal.querySelector('.modal-close-button');
        const cancelButton = document.getElementById('cancel-folder-button');
        const confirmButton = document.getElementById('confirm-folder-button');

        closeButton?.addEventListener('click', () => this.closeFolderSelectorModal());
        cancelButton?.addEventListener('click', () => this.closeFolderSelectorModal());
        confirmButton?.addEventListener('click', () => this.confirmFolderSelection());

        // Le clic sur l'arrière-plan est géré par ModalManager via le listener dans main.ts
        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                 this.closeFolderSelectorModal();
            }
        });
    }
}
