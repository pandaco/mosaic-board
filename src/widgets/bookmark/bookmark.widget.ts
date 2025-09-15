import './bookmark.widget.css';
import { BookmarkWidgetPreferences, BookmarkTreeNode } from '../../types';

interface NavigationState {
    folderId: string;
    folderName: string;
    parentId: string | null;
}

export class BookmarkWidget {
    // _widgetId a été supprimé car inutilisé
    private element: HTMLElement;
    private prefs: BookmarkWidgetPreferences;
    private navigationHistory: NavigationState[] = [];

    constructor(widgetId: string, element: HTMLElement, initialPrefs: BookmarkWidgetPreferences) {
        // L'assignation de _widgetId a été supprimée
        this.element = element;
        this.prefs = initialPrefs;
        // widgetId est toujours reçu mais n'est plus stocké dans une propriété inutilisée
        console.log(`BookmarkWidget initialized with ID (unused internally): ${widgetId}`);
        this.init();
    }

    private init(): void {
        this.navigationHistory = [];
        const defaultFolderId = this.prefs.defaultFolderId || '1'; // Utiliser '1' (Barre personnelle) comme ID par défaut robuste

        try {
            // Tenter de récupérer le dossier par défaut
            chrome.bookmarks.get(defaultFolderId, (nodes) => {
                if (chrome.runtime.lastError || !nodes || nodes.length === 0) {
                    console.warn(`Default folder (${defaultFolderId}) not found or error: ${chrome.runtime.lastError?.message}. Falling back to root.`);
                    // Si le dossier par défaut n'existe pas, utiliser la racine ('0') comme fallback
                    this.navigateToFolder('0', 'Bookmarks Bar', null, true);
                    return;
                }

                // Le dossier par défaut existe
                const initialNode = nodes[0];
                const initialFolderName = initialNode.title || `Folder ${defaultFolderId}`;
                const initialParentId = initialNode.parentId ?? null; // Utiliser ?? pour gérer undefined/null

                this.navigateToFolder(defaultFolderId, initialFolderName, initialParentId, true);
            });
        } catch (error) {
             console.error("Unexpected error during BookmarkWidget initialization:", error);
             this.displayWidgetError("Unexpected error during initialization.");
        }
    }

    updatePreferences(newPrefs: BookmarkWidgetPreferences): void {
        console.log('Updating BookmarkWidget preferences:', newPrefs);
        const oldDefaultFolderId = this.prefs.defaultFolderId;
        this.prefs = newPrefs;

        // Si le dossier par défaut a changé, réinitialiser la navigation
        if (oldDefaultFolderId !== newPrefs.defaultFolderId) {
            console.log('Default folder changed, re-initializing navigation.');
            this.init();
        } else {
            // Sinon, rafraîchir simplement la vue actuelle
            const currentState = this.getCurrentNavigationState();
            if (currentState) {
                console.log('Refreshing current folder view due to preference update.');
                this.renderFolderContents(currentState.folderId); // Mettre à jour l'affichage (ex: vue liste/grille)
            } else {
                // Si aucun état, réinitialiser
                console.log('No current state found, re-initializing navigation.');
                this.init();
            }
        }
    }


    private navigateToFolder(folderId: string, folderName: string, parentId: string | null, isInitialLoadOrRefresh: boolean = false): void {
        const titleElement = this.element.querySelector<HTMLElement>('.widget-title');
        const backButton = this.element.querySelector<HTMLButtonElement>('.widget-back-button');
        const effectiveDefaultFolderId = this.prefs.defaultFolderId || '1'; // Utiliser '1' comme ID par défaut

        console.log(`Navigating to folder: ${folderName} (ID: ${folderId}), ParentID: ${parentId}, Initial/Refresh: ${isInitialLoadOrRefresh}`);


        // Mise à jour du titre du widget
        if (titleElement) {
            const displayTitle = folderName || (folderId === '0' ? 'Bookmarks Bar' : 'Bookmarks');
            titleElement.textContent = displayTitle;
            titleElement.title = displayTitle; // Tooltip
            titleElement.onclick = null; // Réinitialiser l'event listener
            titleElement.style.cursor = 'default';

            // Activer le clic sur le titre pour remonter SEULEMENT si on n'est pas à la racine ('0') ou au dossier par défaut configuré
            // ET qu'il y a un parentId valide (différent de '0')
            if (folderId !== '0' && folderId !== effectiveDefaultFolderId && parentId && parentId !== '0') {
                // Vérifier si le parent existe réellement avant d'ajouter le listener
                 try {
                    chrome.bookmarks.get(parentId, (parentNodes) => {
                        if (!chrome.runtime.lastError && parentNodes && parentNodes.length > 0) {
                            titleElement.style.cursor = 'pointer';
                            titleElement.onclick = (e) => { e.preventDefault(); this.handleGoBack(); };
                        } else {
                             console.warn(`Parent folder (ID: ${parentId}) not found for folder ${folderId}. Title click disabled.`);
                             titleElement.style.cursor = 'default';
                        }
                    });
                 } catch(error) {
                     console.error(`Error checking parent folder ${parentId}:`, error);
                     titleElement.style.cursor = 'default';
                 }
            }
        }

        // Gestion de l'historique de navigation
        const currentState = this.getCurrentNavigationState();
        const newState: NavigationState = { folderId, folderName, parentId };

        if (isInitialLoadOrRefresh) {
            // Si chargement initial ou refresh, l'historique ne contient que l'état actuel
            this.navigationHistory = [newState];
        } else if (!currentState || currentState.folderId !== folderId) {
            // Si on navigue vers un nouveau dossier (pas un refresh), ajouter à l'historique
            this.pushNavigationState(newState);
        }
         console.log('Navigation History:', [...this.navigationHistory]); // Log une copie pour éviter mutation

        // Affichage du bouton "Retour"
        // Le bouton retour est affiché si on n'est PAS dans le dossier racine ('0')
        // ET qu'il y a plus d'un élément dans l'historique (on vient d'ailleurs)
        const showBackButton = folderId !== '0' && this.navigationHistory.length > 1;
        if (backButton) {
            backButton.classList.toggle('hidden', !showBackButton);
            backButton.onclick = showBackButton ? () => this.handleGoBack() : null;
            console.log(`Back button visibility: ${showBackButton}`);
        }

        // Afficher le contenu du dossier
        this.renderFolderContents(folderId);
    }


    private async renderFolderContents(folderId: string): Promise<void> {
        const contentElement = this.element.querySelector<HTMLElement>('.widget-content');
        if (!contentElement) {
            console.error('Widget content element not found.');
            return;
        }

        contentElement.innerHTML = '<p class="loading-message">Loading...</p>'; // Message de chargement

        try {
            chrome.bookmarks.getChildren(folderId, (children) => {
                 if (chrome.runtime.lastError) {
                    console.error(`Error loading children for folder ${folderId}:`, chrome.runtime.lastError.message);
                    this.displayWidgetError(`Error loading folder contents.`);
                    return;
                }

                contentElement.innerHTML = ''; // Nettoyer le contenu précédent
                const fragment = document.createDocumentFragment();

                // Filtrer et trier les dossiers et les favoris
                const folders = children.filter(node => !node.url).sort(this.compareNodes);
                const bookmarks = children.filter(node => node.url).sort(this.compareNodes);

                let hasContent = false;

                // Afficher les dossiers
                if (folders.length > 0) {
                    const folderList = document.createElement('ul');
                    folderList.className = `folder-list view-${this.prefs.view || 'list'}`; // Utiliser la préférence de vue
                    folderList.setAttribute('role', 'list');
                    folders.forEach(folder => {
                        // Le parentId pour un dossier enfant est l'ID du dossier actuel
                        const li = this.createFolderElement(folder, folderId);
                        folderList.appendChild(li);
                    });
                    fragment.appendChild(folderList);
                    hasContent = true;
                }

                // Afficher les favoris
                if (bookmarks.length > 0) {
                     const bookmarkList = document.createElement('ul');
                     bookmarkList.className = `bookmark-list view-${this.prefs.view || 'list'}`; // Utiliser la préférence de vue
                     bookmarkList.setAttribute('role', 'list');
                     bookmarks.forEach(bookmark => {
                         const li = this.createBookmarkElement(bookmark);
                         bookmarkList.appendChild(li);
                     });
                     fragment.appendChild(bookmarkList);
                     hasContent = true;
                }

                // Si le dossier est vide
                if (!hasContent) {
                    contentElement.innerHTML = '<p class="empty-folder">This folder is empty.</p>';
                } else {
                    contentElement.appendChild(fragment);
                }
            });
        } catch (error: any) {
             console.error("Unexpected error rendering folder contents:", error);
             this.displayWidgetError("Unexpected error.");
        }
    }

    // Créer un élément LI pour un dossier
    private createFolderElement(folderNode: BookmarkTreeNode, parentId: string | null): HTMLLIElement {
        const li = document.createElement('li');
        li.className = 'bookmark-item folder-item';
        li.setAttribute('role', 'listitem');

        const link = document.createElement('a');
        link.href = '#'; // Lien factice pour la navigation interne
        const folderTitle = folderNode.title || 'Unnamed folder';
        link.title = folderTitle;
        link.dataset.folderId = folderNode.id;
        link.setAttribute('role', 'button');
        link.setAttribute('aria-label', `Folder: ${folderTitle}`); // Pour l'accessibilité

        // Gestionnaire de clic pour naviguer dans le dossier
        link.addEventListener('click', (e) => {
            e.preventDefault();
            this.navigateToFolder(folderNode.id, folderNode.title, parentId);
        });
        // Gestionnaire pour la navigation clavier
        link.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.navigateToFolder(folderNode.id, folderNode.title, parentId);
            }
        });

        // Icône du dossier
        const icon = document.createElement('i');
        icon.className = 'fas fa-folder item-icon';
        icon.setAttribute('aria-hidden', 'true');

        // Titre du dossier
        const titleSpan = document.createElement('span');
        titleSpan.className = 'item-title';
        titleSpan.textContent = folderTitle;

        link.appendChild(icon);
        link.appendChild(titleSpan);

        // Affichage optionnel du nombre d'éléments (si activé dans les prefs)
        if (this.prefs.showCount) {
             // Utiliser children.length si disponible, sinon requête asynchrone
             if (folderNode.children) {
                 const count = folderNode.children.length;
                 const countSpan = document.createElement('span');
                 countSpan.className = 'item-count';
                 countSpan.textContent = ` (${count})`;
                 countSpan.setAttribute('aria-label', `${count} items`);
                 link.appendChild(countSpan);
             } else {
                 // Si children n'est pas chargé, on peut essayer de le charger
                 // Note : Cela peut ralentir l'affichage initial si beaucoup de dossiers
                 chrome.bookmarks.getChildren(folderNode.id, (children) => {
                     if (!chrome.runtime.lastError) {
                         const count = children.length;
                         const countSpan = document.createElement('span');
                         countSpan.className = 'item-count';
                         countSpan.textContent = ` (${count})`;
                         countSpan.setAttribute('aria-label', `${count} items`);
                         // S'assurer que le lien existe toujours (navigation rapide)
                         if (li.contains(link)) {
                            link.appendChild(countSpan);
                         }
                     }
                 });
             }
        }

        li.appendChild(link);
        return li;
    }

    // Créer un élément LI pour un favori
    private createBookmarkElement(bookmarkNode: BookmarkTreeNode): HTMLLIElement {
        const li = document.createElement('li');
        li.className = 'bookmark-item bookmark-link';
        li.setAttribute('role', 'listitem');

        const link = document.createElement('a');
        const url = bookmarkNode.url || '#'; // Utiliser '#' si l'URL est manquante
        const title = bookmarkNode.title || url; // Utiliser l'URL comme titre si manquant

        link.href = url;
        if (url !== '#') {
            link.target = '_blank'; // Ouvrir dans un nouvel onglet
            link.rel = 'noopener noreferrer'; // Sécurité
        }
        link.title = `${title}\n${url}`; // Tooltip avec titre et URL

        // Favicon
        const favicon = document.createElement('img');
        favicon.className = 'item-icon favicon';
        favicon.width = 16;
        favicon.height = 16;
        favicon.alt = ''; // Alt vide car décoratif

        let domain = '';
        try {
            if (url && url !== '#') {
                domain = new URL(url).hostname;
            }
        } catch (e) {
            console.warn(`Invalid URL for favicon: ${url}`);
        }

        // Favicon par défaut (SVG inline)
        const fallbackSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="bi bi-globe"><path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm7.5-6.923c-.67.204-1.335.82-1.887 1.855A7.97 7.97 0 0 0 5.145 4H7.5V1.077zM4.09 4a9.267 9.267 0 0 1 .64-1.539 6.7 6.7 0 0 1 .597-.933A7.025 7.025 0 0 0 2.255 4H4.09zm-.582 3.5c.03-.877.138-1.718.312-2.5H1.674a6.958 6.958 0 0 0-.656 2.5h2.49zM4.847 5a12.5 12.5 0 0 0-.338 2.5H7.5V5H4.847zM8.5 5v2.5h2.99a12.495 12.495 0 0 0-.337-2.5H8.5zM4.51 8.5a12.5 12.5 0 0 0 .337 2.5H7.5V8.5H4.51zm3.99 0V11h2.653c.187-.765.306-1.608.338-2.5H8.5zM5.145 12c.138.386.295.744.468 1.068.552 1.035 1.218 1.65 1.887 1.855V12H5.145zm.182 2.472a6.696 6.696 0 0 1-.597-.933A9.268 9.268 0 0 1 4.09 12H2.255a7.024 7.024 0 0 0 3.072 2.472zM3.82 11a13.652 13.652 0 0 1-.312-2.5h-2.49c.062.89.291 1.733.656 2.5H3.82zm6.853 3.472A7.024 7.024 0 0 0 13.745 12H11.91a9.27 9.27 0 0 1-.64 1.539 6.688 6.688 0 0 1-.597.933zM8.5 12h2.855c.173-.324.33-.682.468-1.068.552-1.035 1.218-1.65 1.887-1.855V12H8.5zm3.68-1h2.49a6.959 6.959 0 0 0-.656-2.5H12.18c.03.877.138 1.718.312 2.5zM11.91 4a9.27 9.27 0 0 1 .64-1.539 6.688 6.688 0 0 1 .597-.933A7.025 7.025 0 0 0 13.745 4H11.91zm-.468 2.5c-.138-.386-.295-.744-.468-1.068-.552-1.035-1.218-1.65-1.887-1.855V5H11.44z"/></svg>`;
        const fallbackSvgDataUri = `data:image/svg+xml,${encodeURIComponent(fallbackSvg)}`;

        // Tenter de charger le favicon Google, sinon utiliser le SVG par défaut
        if (domain) {
            favicon.src = `https://www.google.com/s2/favicons?sz=32&domain_url=${encodeURIComponent(domain)}`;
        } else {
            favicon.src = fallbackSvgDataUri;
            favicon.style.filter = 'grayscale(1)'; // Optionnel: griser l'icône par défaut
        }

        // Gestionnaire d'erreur pour le chargement du favicon
        favicon.onerror = () => {
            favicon.src = fallbackSvgDataUri;
            favicon.style.filter = 'grayscale(1)';
            favicon.onerror = null; // Éviter boucle infinie si le SVG par défaut ne charge pas
        };

        // Titre du favori
        const titleSpan = document.createElement('span');
        titleSpan.className = 'item-title';
        titleSpan.textContent = title;

        link.appendChild(favicon);
        link.appendChild(titleSpan);
        li.appendChild(link);
        return li;
    }

    // Gère le clic sur le bouton "Retour" ou sur le titre du widget
    private handleGoBack(): void {
        console.log('Handling Go Back. Current history length:', this.navigationHistory.length);
        if (this.navigationHistory && this.navigationHistory.length > 1) {
            this.navigationHistory.pop(); // Retirer l'état actuel
            const previousState = this.navigationHistory[this.navigationHistory.length - 1]; // Obtenir l'état précédent
            console.log('Navigating back to:', previousState);
            // Naviguer vers l'état précédent, marquer comme refresh pour ne pas repousser dans l'historique
            this.navigateToFolder(previousState.folderId, previousState.folderName, previousState.parentId, true);
        } else {
            // Si on est déjà à la racine ou qu'il n'y a qu'un élément, cacher le bouton retour
            console.log('Cannot go back further.');
            const backButton = this.element.querySelector<HTMLButtonElement>('.widget-back-button');
            backButton?.classList.add('hidden');
        }
    }


    // Retourne l'état de navigation actuel (dernier élément de l'historique)
    private getCurrentNavigationState(): NavigationState | null {
         return (this.navigationHistory && this.navigationHistory.length > 0)
             ? this.navigationHistory[this.navigationHistory.length - 1]
             : null;
    }

    // Ajoute un nouvel état à l'historique de navigation
    private pushNavigationState(state: NavigationState): void {
        if (!this.navigationHistory) {
            this.navigationHistory = [];
        }
        this.navigationHistory.push(state);
    }

    // Compare deux nœuds de favoris pour le tri (alphabétique par titre)
    private compareNodes(a: BookmarkTreeNode, b: BookmarkTreeNode): number {
        const titleA = a.title?.toLowerCase() || '';
        const titleB = b.title?.toLowerCase() || '';
        if (titleA < titleB) return -1;
        if (titleA > titleB) return 1;
        return 0;
    }

    // Affiche un message d'erreur dans le contenu du widget
     private displayWidgetError(message: string): void {
        const contentElement = this.element.querySelector<HTMLElement>('.widget-content');
        if (contentElement) {
            contentElement.innerHTML = `<p class="error">${message || 'An error occurred.'}</p>`;
        }
    }
}

// Fonctions exportées pour le gestionnaire de cycle de vie
export function initBookmarkWidget(id: string, element: HTMLElement, prefs: BookmarkWidgetPreferences): void {
    new BookmarkWidget(id, element, prefs);
}

export function updateBookmarkWidgetPreferences(id: string, prefs: BookmarkWidgetPreferences): void {
    const widgetContainer = document.getElementById(id);
    const element = widgetContainer?.querySelector<HTMLElement>('.grid-stack-item-content');
    if (element) {
        // Plutôt que de ré-initialiser, on pourrait chercher l'instance existante et appeler updatePreferences
        // Mais pour la simplicité et si l'état interne n'est pas critique, la ré-initialisation fonctionne.
        console.warn(`Re-initializing BookmarkWidget ${id} due to preference update.`);
        new BookmarkWidget(id, element, prefs);
    } else {
         console.error(`Could not find element for BookmarkWidget ${id} to update preferences.`);
    }
}
