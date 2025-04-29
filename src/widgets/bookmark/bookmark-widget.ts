import './bookmark-widget.css'; // Import specific styles
import { BookmarkWidgetPreferences, BookmarkTreeNode } from '../../types';

interface NavigationState {
    folderId: string;
    folderName: string;
    parentId: string | null; // ID of the parent folder, null if root
}

// Store navigation history per widget instance
const navigationHistory: Record<string, NavigationState[]> = {};

/** Helper to display error messages within the widget content area */
function displayWidgetError(element: HTMLElement, message: string): void {
    const contentElement = element.querySelector<HTMLElement>('.widget-content');
    if (contentElement) {
        contentElement.innerHTML = `<p class="error">${message}</p>`;
    }
}

/**
 * Initializes the bookmark widget instance.
 * @param widgetId The unique ID of the widget instance.
 * @param element The widget's content HTMLElement (.grid-stack-item-content).
 * @param prefs The initial preferences for this widget instance.
 */
export function initBookmarkWidget(widgetId: string, element: HTMLElement, prefs: BookmarkWidgetPreferences): void {
    navigationHistory[widgetId] = []; // Initialize history for this widget

    const defaultFolderId = prefs.defaultFolderId || '1'; // Default to Bookmarks Bar or Root

    // Fetch initial folder name for the title and history
    try {
        chrome.bookmarks.get(defaultFolderId, (nodes) => {
            if (chrome.runtime.lastError) {
                console.error(`Error fetching default folder ${defaultFolderId}:`, chrome.runtime.lastError);
                displayWidgetError(element, `Erreur: Dossier par défaut (${defaultFolderId}) introuvable.`);
                // Optionally, try navigating to root '0' or '1' as fallback
                // navigateToFolder(widgetId, element, '1', 'Favoris', '0', prefs, true);
                return;
            }

            let initialFolderName = 'Favoris';
            let initialParentId: string | null = null;

            if (nodes && nodes.length > 0) {
                 initialFolderName = nodes[0].title || `Dossier ${defaultFolderId}`;
                 initialParentId = nodes[0].parentId ?? null;
            } else {
                console.warn(`Default folder with ID ${defaultFolderId} not found, though no API error occurred.`);
                displayWidgetError(element, `Dossier par défaut (${defaultFolderId}) non trouvé.`);
                // Optionally fallback
                // navigateToFolder(widgetId, element, '1', 'Favoris', '0', prefs, true);
                return;
            }
            navigateToFolder(widgetId, element, defaultFolderId, initialFolderName, initialParentId, prefs, true);
        });
    } catch (error) {
         console.error("Unexpected error during initial bookmark fetch:", error);
         displayWidgetError(element, "Erreur inattendue lors de l'initialisation.");
    }
}

/**
 * Updates the bookmark widget display based on new preferences.
 * @param widgetId The unique ID of the widget instance.
 * @param prefs The updated preferences.
 */
export function updateBookmarkWidgetPreferences(widgetId: string, prefs: BookmarkWidgetPreferences): void {
    const widgetContainer = document.getElementById(widgetId);
    const widgetElement = widgetContainer?.querySelector<HTMLElement>('.grid-stack-item-content');

    if (widgetElement) {
        const currentState = getCurrentNavigationState(widgetId);
        if (currentState) {
            // Check if defaultFolderId exists before navigating
            const folderIdToRender = currentState.folderId;
            try {
                 chrome.bookmarks.get(folderIdToRender, (nodes) => {
                     if (chrome.runtime.lastError || !nodes || nodes.length === 0) {
                         console.warn(`Current folder ${folderIdToRender} seems invalid after pref update. Navigating to new default.`);
                         // If current folder is invalid, navigate to the new default folder
                         initBookmarkWidget(widgetId, widgetElement, prefs);
                     } else {
                         // Current folder is valid, refresh view and navigation state
                         renderFolderContents(widgetId, widgetElement, folderIdToRender, prefs);
                         navigateToFolder(widgetId, widgetElement, folderIdToRender, currentState.folderName, currentState.parentId, prefs, true); // Treat as refresh
                     }
                 });
            } catch (error) {
                 console.error(`Error checking current folder ${folderIdToRender} validity:`, error);
                 displayWidgetError(widgetElement, "Erreur lors de la mise à jour.");
            }

        } else {
             console.warn(`No navigation state found for widget ${widgetId} during preference update. Re-initializing.`);
             initBookmarkWidget(widgetId, widgetElement, prefs);
        }
    } else {
         console.warn(`Could not find content element for widget ${widgetId} during preference update.`);
    }
}


/**
 * Navigates to a specific bookmark folder and renders its content.
 * Manages the internal navigation history for the widget.
 * @param widgetId Widget instance ID.
 * @param element Widget's content element (.grid-stack-item-content).
 * @param folderId ID of the folder to navigate to.
 * @param folderName Name of the folder (for title).
 * @param parentId Parent folder ID (string | null).
 * @param prefs Current preferences.
 * @param isInitialLoadOrRefresh Flag to prevent pushing state on initial load or state refresh.
 */
function navigateToFolder(
    widgetId: string,
    element: HTMLElement,
    folderId: string,
    folderName: string,
    parentId: string | null,
    prefs: BookmarkWidgetPreferences,
    isInitialLoadOrRefresh: boolean = false
): void {

    const titleElement = element.querySelector<HTMLElement>('.widget-title');
    const backButton = element.querySelector<HTMLButtonElement>('.widget-back-button');
    const effectiveDefaultFolderId = prefs.defaultFolderId || '1';

    if (titleElement) {
        titleElement.textContent = folderName || 'Favoris';
        titleElement.title = folderName || 'Favoris';
        titleElement.onclick = null;
        titleElement.style.cursor = 'default';

        // Only add back navigation via title if not at default AND parent exists
        if (folderId !== effectiveDefaultFolderId && parentId) {
             try {
                chrome.bookmarks.get(parentId, (parentNodes) => {
                    // Check for errors *and* if nodes were returned
                    if (!chrome.runtime.lastError && parentNodes && parentNodes.length > 0) {
                        titleElement.style.cursor = 'pointer';
                        titleElement.onclick = (e) => {
                            e.preventDefault();
                            handleGoBack(widgetId, element, prefs);
                        };
                    } else {
                         if (chrome.runtime.lastError) {
                              console.warn(`Error checking parent folder ${parentId} for title click: ${chrome.runtime.lastError.message}`);
                         }
                         // Keep cursor default if parent check fails or parent doesn't exist
                         titleElement.style.cursor = 'default';
                    }
                });
             } catch (error) {
                 console.error(`Unexpected error checking parent folder ${parentId}:`, error);
                 titleElement.style.cursor = 'default';
             }
        }
    }

    const currentState = getCurrentNavigationState(widgetId);
    const newState: NavigationState = { folderId, folderName, parentId };

    if (isInitialLoadOrRefresh) {
        navigationHistory[widgetId] = [newState];
    } else if (!currentState || currentState.folderId !== folderId) {
        pushNavigationState(widgetId, newState);
    }

    const history = navigationHistory[widgetId] || [];
    const showBackButton = folderId !== effectiveDefaultFolderId && history.length > 1;

    if (backButton) {
        backButton.classList.toggle('hidden', !showBackButton);
        backButton.onclick = showBackButton ? () => handleGoBack(widgetId, element, prefs) : null;
    }

    // Render content *after* updating UI elements like title/back button
    renderFolderContents(widgetId, element, folderId, prefs);
}


/**
 * Renders the contents (subfolders and bookmarks) of a given folder.
 * @param widgetId Widget instance ID.
 * @param element Widget's content element (.grid-stack-item-content).
 * @param folderId ID of the folder to render.
 * @param prefs Current preferences.
 */
async function renderFolderContents(widgetId: string, element: HTMLElement, folderId: string, prefs: BookmarkWidgetPreferences): Promise<void> {
    const contentElement = element.querySelector<HTMLElement>('.widget-content');
    if (!contentElement) {
        console.error(`Widget content element not found for ID ${widgetId}`);
        return;
    }

    contentElement.innerHTML = '<p>Chargement...</p>';

    try {
        // Use async/await version for cleaner error handling if available,
        // otherwise stick to callback with error checking.
        // Assuming chrome.bookmarks.getChildren still uses callbacks:
        chrome.bookmarks.getChildren(folderId, (children) => {
             if (chrome.runtime.lastError) {
                console.error(`Error fetching children for folder ${folderId}:`, chrome.runtime.lastError);
                displayWidgetError(element, `Erreur chargement dossier (${folderId}).`);
                return;
            }

            contentElement.innerHTML = ''; // Clear loading

            const folders = children.filter(node => !node.url).sort(compareNodes);
            const bookmarks = children.filter(node => node.url).sort(compareNodes);

            const fragment = document.createDocumentFragment();
            let hasContent = false;

            if (folders.length > 0) {
                const folderList = document.createElement('ul');
                folderList.className = `folder-list view-${prefs.view}`;
                folderList.setAttribute('role', 'list'); // ARIA role
                folders.forEach(folder => {
                    const parentIdForFolder = folder.parentId ?? null;
                    const li = createFolderElement(widgetId, element, folder, parentIdForFolder, prefs);
                    folderList.appendChild(li);
                });
                fragment.appendChild(folderList);
                hasContent = true;
            }

            if (bookmarks.length > 0) {
                const bookmarkList = document.createElement('ul');
                bookmarkList.className = `bookmark-list view-${prefs.view}`;
                bookmarkList.setAttribute('role', 'list'); // ARIA role
                bookmarks.forEach(bookmark => {
                    const li = createBookmarkElement(bookmark, prefs);
                    bookmarkList.appendChild(li);
                });
                fragment.appendChild(bookmarkList);
                hasContent = true;
            }

            if (!hasContent) {
                contentElement.innerHTML = '<p class="empty-folder">Ce dossier est vide.</p>';
            } else {
                contentElement.appendChild(fragment);
            }
        });

    } catch (error: any) { // Catch unexpected errors synchronous errors if any
        console.error(`Unexpected error in renderFolderContents for folder ${folderId}:`, error);
        displayWidgetError(element, "Erreur inattendue.");
    }
}


/**
 * Creates the HTML element for a folder item.
 * @param widgetId Widget instance ID.
 * @param widgetElement Widget's content element (.grid-stack-item-content).
 * @param folderNode The bookmark node representing the folder.
 * @param parentId The ID of the parent folder (string | null).
 * @param prefs Current preferences.
 * @returns The created LI element.
 */
function createFolderElement(
    widgetId: string,
    widgetElement: HTMLElement,
    folderNode: BookmarkTreeNode,
    parentId: string | null,
    prefs: BookmarkWidgetPreferences
): HTMLLIElement {
    const li = document.createElement('li');
    li.className = 'bookmark-item folder-item';
    li.setAttribute('role', 'listitem'); // ARIA role

    const link = document.createElement('a');
    link.href = '#';
    link.title = folderNode.title || 'Dossier sans nom';
    link.dataset.folderId = folderNode.id;
    link.setAttribute('role', 'button'); // Treat like a button for interaction

    link.addEventListener('click', (e) => {
        e.preventDefault();
        navigateToFolder(widgetId, widgetElement, folderNode.id, folderNode.title, parentId, prefs);
    });
     // Allow activation with Enter/Space for accessibility
     link.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            navigateToFolder(widgetId, widgetElement, folderNode.id, folderNode.title, parentId, prefs);
        }
    });


    const icon = document.createElement('i');
    icon.className = 'fas fa-folder item-icon';
    icon.setAttribute('aria-hidden', 'true');

    const titleSpan = document.createElement('span');
    titleSpan.className = 'item-title';
    titleSpan.textContent = folderNode.title || 'Dossier sans nom';

    link.appendChild(icon);
    link.appendChild(titleSpan);

    if (prefs.showCount) {
        const count = folderNode.children?.length;
        if (typeof count === 'number') {
             const countSpan = document.createElement('span');
             countSpan.className = 'item-count';
             countSpan.textContent = ` (${count})`;
             countSpan.setAttribute('aria-label', `${count} éléments`);
             link.appendChild(countSpan);
        }
    }

    li.appendChild(link);
    return li;
}


/**
 * Creates the HTML element for a bookmark item.
 * @param bookmarkNode The bookmark node.
 * @param prefs Current preferences (used for view type, potentially).
 * @returns The created LI element.
 */
function createBookmarkElement(bookmarkNode: BookmarkTreeNode, _prefs: BookmarkWidgetPreferences): HTMLLIElement {
    const li = document.createElement('li');
    li.className = 'bookmark-item bookmark-link';
     li.setAttribute('role', 'listitem'); // ARIA role

    const link = document.createElement('a');
    const url = bookmarkNode.url || '#';
    const title = bookmarkNode.title || url;

    link.href = url;
    if (url !== '#') {
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
    }
    link.title = `${title}\n${url}`;

    const favicon = document.createElement('img');
    favicon.className = 'item-icon favicon';
    favicon.width = 16;
    favicon.height = 16;
    let domain = '';
    try {
         if (url && url !== '#') {
             domain = new URL(url).hostname;
         }
    } catch (e) {
         console.warn(`Invalid URL for favicon: ${url}`);
    }

    const fallbackSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="bi bi-globe"><path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm7.5-6.923c-.67.204-1.335.82-1.887 1.855A7.97 7.97 0 0 0 5.145 4H7.5V1.077zM4.09 4a9.267 9.267 0 0 1 .64-1.539 6.7 6.7 0 0 1 .597-.933A7.025 7.025 0 0 0 2.255 4H4.09zm-.582 3.5c.03-.877.138-1.718.312-2.5H1.674a6.958 6.958 0 0 0-.656 2.5h2.49zM4.847 5a12.5 12.5 0 0 0-.338 2.5H7.5V5H4.847zM8.5 5v2.5h2.99a12.495 12.495 0 0 0-.337-2.5H8.5zM4.51 8.5a12.5 12.5 0 0 0 .337 2.5H7.5V8.5H4.51zm3.99 0V11h2.653c.187-.765.306-1.608.338-2.5H8.5zM5.145 12c.138.386.295.744.468 1.068.552 1.035 1.218 1.65 1.887 1.855V12H5.145zm.182 2.472a6.696 6.696 0 0 1-.597-.933A9.268 9.268 0 0 1 4.09 12H2.255a7.024 7.024 0 0 0 3.072 2.472zM3.82 11a13.652 13.652 0 0 1-.312-2.5h-2.49c.062.89.291 1.733.656 2.5H3.82zm6.853 3.472A7.024 7.024 0 0 0 13.745 12H11.91a9.27 9.27 0 0 1-.64 1.539 6.688 6.688 0 0 1-.597.933zM8.5 12h2.855c.173-.324.33-.682.468-1.068.552-1.035 1.218-1.65 1.887-1.855V12H8.5zm3.68-1h2.49a6.959 6.959 0 0 0-.656-2.5H12.18c.03.877.138 1.718.312 2.5zM11.91 4a9.27 9.27 0 0 1 .64-1.539 6.688 6.688 0 0 1 .597-.933A7.025 7.025 0 0 0 13.745 4H11.91zm-.468 2.5c-.138-.386-.295-.744-.468-1.068-.552-1.035-1.218-1.65-1.887-1.855V5H11.44z"/></svg>`;
    const fallbackSvgDataUri = `data:image/svg+xml,${encodeURIComponent(fallbackSvg)}`;

    if (domain) {
        favicon.src = `https://www.google.com/s2/favicons?sz=32&domain_url=${encodeURIComponent(domain)}`;
    } else {
        favicon.src = fallbackSvgDataUri;
        favicon.style.filter = 'grayscale(1)';
    }

    favicon.alt = ''; // Decorative
    favicon.onerror = () => {
        favicon.src = fallbackSvgDataUri;
        favicon.style.filter = 'grayscale(1)';
        favicon.onerror = null;
    };

    const titleSpan = document.createElement('span');
    titleSpan.className = 'item-title';
    titleSpan.textContent = title || '';

    link.appendChild(favicon);
    link.appendChild(titleSpan);

    li.appendChild(link);
    return li;
}


/**
 * Handles the logic for going back in the widget's navigation history.
 * @param widgetId Widget instance ID.
 * @param element Widget's content element (.grid-stack-item-content).
 * @param prefs Current preferences.
 */
function handleGoBack(widgetId: string, element: HTMLElement, prefs: BookmarkWidgetPreferences): void {
    const history = navigationHistory[widgetId];
    if (history && history.length > 1) {
        history.pop();
        const previousState = history[history.length - 1];
        navigateToFolder(widgetId, element, previousState.folderId, previousState.folderName, previousState.parentId, prefs, true); // Treat as refresh
    } else {
        console.warn(`Cannot go back further for widget ${widgetId}. History:`, history);
        const backButton = element.querySelector<HTMLButtonElement>('.widget-back-button');
        backButton?.classList.add('hidden');
    }
}


/** Helper to get the current navigation state */
function getCurrentNavigationState(widgetId: string): NavigationState | null {
     const history = navigationHistory[widgetId];
     return (history && history.length > 0) ? history[history.length - 1] : null;
}

/** Helper to push a new state onto the navigation history */
function pushNavigationState(widgetId: string, state: NavigationState): void {
    if (!navigationHistory[widgetId]) {
        navigationHistory[widgetId] = [];
    }
    navigationHistory[widgetId].push(state);
}


/** Comparison function for sorting bookmark nodes alphabetically by title */
function compareNodes(a: BookmarkTreeNode, b: BookmarkTreeNode): number {
    const titleA = a.title?.toLowerCase() || '';
    const titleB = b.title?.toLowerCase() || '';
    if (titleA < titleB) return -1;
    if (titleA > titleB) return 1;
    return 0;
}
