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
        // Changed text
        contentElement.innerHTML = `<p class="error">${message || 'An error occurred.'}</p>`;
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

    try {
        chrome.bookmarks.get(defaultFolderId, (nodes) => {
            if (chrome.runtime.lastError) {
                console.error(`Error fetching default folder ${defaultFolderId}:`, chrome.runtime.lastError);
                // Changed text
                displayWidgetError(element, `Error: Default folder (${defaultFolderId}) not found.`);
                return;
            }

            // Changed default text
            let initialFolderName = 'Bookmarks';
            let initialParentId: string | null = null;

            if (nodes && nodes.length > 0) {
                 // Changed fallback text
                 initialFolderName = nodes[0].title || `Folder ${defaultFolderId}`;
                 initialParentId = nodes[0].parentId ?? null;
            } else {
                console.warn(`Default folder with ID ${defaultFolderId} not found, though no API error occurred.`);
                // Changed text
                displayWidgetError(element, `Default folder (${defaultFolderId}) not found.`);
                return;
            }
            navigateToFolder(widgetId, element, defaultFolderId, initialFolderName, initialParentId, prefs, true);
        });
    } catch (error) {
         console.error("Unexpected error during initial bookmark fetch:", error);
         // Changed text
         displayWidgetError(element, "Unexpected error during initialization.");
    }
}

/**
 * Updates the bookmark widget display based on new preferences.
 */
export function updateBookmarkWidgetPreferences(widgetId: string, prefs: BookmarkWidgetPreferences): void {
    const widgetContainer = document.getElementById(widgetId);
    const widgetElement = widgetContainer?.querySelector<HTMLElement>('.grid-stack-item-content');

    if (widgetElement) {
        const currentState = getCurrentNavigationState(widgetId);
        if (currentState) {
            const folderIdToRender = currentState.folderId;
            try {
                 chrome.bookmarks.get(folderIdToRender, (nodes) => {
                     if (chrome.runtime.lastError || !nodes || nodes.length === 0) {
                         console.warn(`Current folder ${folderIdToRender} seems invalid after pref update. Navigating to new default.`);
                         initBookmarkWidget(widgetId, widgetElement, prefs);
                     } else {
                         renderFolderContents(widgetId, widgetElement, folderIdToRender, prefs);
                         navigateToFolder(widgetId, widgetElement, folderIdToRender, currentState.folderName, currentState.parentId, prefs, true); // Treat as refresh
                     }
                 });
            } catch (error) {
                 console.error(`Error checking current folder ${folderIdToRender} validity:`, error);
                 // Changed text
                 displayWidgetError(widgetElement, "Error during update.");
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
        // Changed default text
        titleElement.textContent = folderName || 'Bookmarks';
        titleElement.title = folderName || 'Bookmarks';
        titleElement.onclick = null;
        titleElement.style.cursor = 'default';

        if (folderId !== effectiveDefaultFolderId && parentId) {
             try {
                chrome.bookmarks.get(parentId, (parentNodes) => {
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

    renderFolderContents(widgetId, element, folderId, prefs);
}


/**
 * Renders the contents (subfolders and bookmarks) of a given folder.
 */
async function renderFolderContents(widgetId: string, element: HTMLElement, folderId: string, prefs: BookmarkWidgetPreferences): Promise<void> {
    const contentElement = element.querySelector<HTMLElement>('.widget-content');
    if (!contentElement) {
        console.error(`Widget content element not found for ID ${widgetId}`);
        return;
    }

    // Changed text
    contentElement.innerHTML = '<p>Loading...</p>';

    try {
        chrome.bookmarks.getChildren(folderId, (children) => {
             if (chrome.runtime.lastError) {
                console.error(`Error fetching children for folder ${folderId}:`, chrome.runtime.lastError);
                // Changed text
                displayWidgetError(element, `Error loading folder (${folderId}).`);
                return;
            }

            contentElement.innerHTML = '';

            const folders = children.filter(node => !node.url).sort(compareNodes);
            const bookmarks = children.filter(node => node.url).sort(compareNodes);

            const fragment = document.createDocumentFragment();
            let hasContent = false;

            if (folders.length > 0) {
                const folderList = document.createElement('ul');
                folderList.className = `folder-list view-${prefs.view}`;
                folderList.setAttribute('role', 'list');
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
                bookmarkList.setAttribute('role', 'list');
                bookmarks.forEach(bookmark => {
                    const li = createBookmarkElement(bookmark, prefs);
                    bookmarkList.appendChild(li);
                });
                fragment.appendChild(bookmarkList);
                hasContent = true;
            }

            if (!hasContent) {
                // Changed text
                contentElement.innerHTML = '<p class="empty-folder">This folder is empty.</p>';
            } else {
                contentElement.appendChild(fragment);
            }
        });

    } catch (error: any) {
        console.error(`Unexpected error in renderFolderContents for folder ${folderId}:`, error);
        // Changed text
        displayWidgetError(element, "Unexpected error.");
    }
}


/**
 * Creates the HTML element for a folder item.
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
    li.setAttribute('role', 'listitem');

    const link = document.createElement('a');
    link.href = '#';
    // Changed fallback text
    link.title = folderNode.title || 'Unnamed folder';
    link.dataset.folderId = folderNode.id;
    link.setAttribute('role', 'button');

    link.addEventListener('click', (e) => {
        e.preventDefault();
        navigateToFolder(widgetId, widgetElement, folderNode.id, folderNode.title, parentId, prefs);
    });
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
    // Changed fallback text
    titleSpan.textContent = folderNode.title || 'Unnamed folder';

    link.appendChild(icon);
    link.appendChild(titleSpan);

    if (prefs.showCount) {
        const count = folderNode.children?.length;
        if (typeof count === 'number') {
             const countSpan = document.createElement('span');
             countSpan.className = 'item-count';
             countSpan.textContent = ` (${count})`;
             // Changed aria-label
             countSpan.setAttribute('aria-label', `${count} items`);
             link.appendChild(countSpan);
        }
    }

    li.appendChild(link);
    return li;
}


/**
 * Creates the HTML element for a bookmark item.
 */
function createBookmarkElement(bookmarkNode: BookmarkTreeNode, _prefs: BookmarkWidgetPreferences): HTMLLIElement {
    const li = document.createElement('li');
    li.className = 'bookmark-item bookmark-link';
     li.setAttribute('role', 'listitem');

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
