import './bookmark-widget.css'; // Import specific styles
import { BookmarkWidgetPreferences, BookmarkTreeNode } from '../../types';
// Removed unused getWidgetPreferences import

interface NavigationState {
    folderId: string;
    folderName: string;
    parentId: string | null; // ID of the parent folder, null if root
}

// Store navigation history per widget instance
const navigationHistory: Record<string, NavigationState[]> = {};

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
    chrome.bookmarks.get(defaultFolderId, (nodes) => {
        let initialFolderName = 'Favoris'; // Default name
        let initialParentId: string | null = null; // Default parent ID

        if (chrome.runtime.lastError) {
            console.warn(`Error fetching default folder ${defaultFolderId}:`, chrome.runtime.lastError.message);
            // Handle error, maybe fall back to root or show error state
            initialFolderName = "Erreur de dossier";
            // Cannot determine parentId if fetch failed
        } else if (nodes && nodes.length > 0) {
             initialFolderName = nodes[0].title || `Dossier ${defaultFolderId}`;
             // Ensure parentId is null if undefined, otherwise use the string value
             initialParentId = nodes[0].parentId ?? null;
        } else {
            console.warn(`Default folder with ID ${defaultFolderId} not found.`);
             initialFolderName = "Dossier introuvable";
             // Cannot determine parentId if not found
        }


        // Start navigation at the default folder
        // Pass the potentially corrected initialParentId (string | null)
        navigateToFolder(widgetId, element, defaultFolderId, initialFolderName, initialParentId, prefs, true); // isInitialLoad = true
    });

    // Add popstate listener specific to this widget instance? - Tricky
    // A global popstate listener might be easier, checking if the state belongs to a bookmark widget.
    // For simplicity now, we rely on the back button click.
}

/**
 * Updates the bookmark widget display based on new preferences.
 * @param widgetId The unique ID of the widget instance.
 * @param prefs The updated preferences.
 */
export function updateBookmarkWidgetPreferences(widgetId: string, prefs: BookmarkWidgetPreferences): void {
    // Find the specific widget's content element
    const widgetContainer = document.getElementById(widgetId);
    const widgetElement = widgetContainer?.querySelector<HTMLElement>('.grid-stack-item-content'); // Target the inner content

    if (widgetElement) {
        // Re-render content based on new view or count setting
        const currentState = getCurrentNavigationState(widgetId);
        if (currentState) {
            // Re-render the current folder with the new preferences
            renderFolderContents(widgetId, widgetElement, currentState.folderId, prefs);
             // Also update navigation elements (title clickability, back button) based on new default folder ID
             navigateToFolder(widgetId, widgetElement, currentState.folderId, currentState.folderName, currentState.parentId, prefs, false); // Not initial load, just refresh state
        } else {
             // If no state (shouldn't happen after init), reload default
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
 * @param parentId Parent folder ID (for back button logic). Should be string | null.
 * @param prefs Current preferences.
 * @param isInitialLoad Flag to prevent pushing state on initial load or state refresh.
 */
function navigateToFolder(
    widgetId: string,
    element: HTMLElement,
    folderId: string,
    folderName: string,
    parentId: string | null, // Explicitly string | null
    prefs: BookmarkWidgetPreferences,
    isInitialLoadOrRefresh: boolean = false
): void {

    const titleElement = element.querySelector<HTMLElement>('.widget-title');
    const backButton = element.querySelector<HTMLButtonElement>('.widget-back-button');

    const effectiveDefaultFolderId = prefs.defaultFolderId || '1'; // Use '1' if null/undefined

    // Update Title
    if (titleElement) {
        titleElement.textContent = folderName || 'Favoris';
        titleElement.title = folderName || 'Favoris'; // Tooltip
        // Make title clickable to navigate *up* if not at the default root
        titleElement.onclick = null; // Clear previous handler
        titleElement.style.cursor = 'default'; // Default cursor

        // Allow clicking title to go back IF we are not in the default folder AND have a valid parentId
        if (folderId !== effectiveDefaultFolderId && parentId) {
             // Check if parent exists before making title clickable
             chrome.bookmarks.get(parentId, (parentNodes) => {
                 if (!chrome.runtime.lastError && parentNodes && parentNodes.length > 0) {
                     // Parent exists, make title clickable
                     titleElement.style.cursor = 'pointer';
                     titleElement.onclick = (e) => {
                         e.preventDefault();
                         handleGoBack(widgetId, element, prefs);
                     };
                 } else {
                      // Parent doesn't exist or error, keep title non-clickable
                      if (chrome.runtime.lastError) {
                           console.warn(`Error checking parent folder ${parentId}: ${chrome.runtime.lastError.message}`);
                      }
                      titleElement.style.cursor = 'default';
                 }
             });
        }
    }

    // --- Manage History ---
    const currentState = getCurrentNavigationState(widgetId);
    const newState: NavigationState = { folderId, folderName, parentId };

    if (isInitialLoadOrRefresh) {
        // On initial load or refresh (like pref change), reset history to current state
        navigationHistory[widgetId] = [newState];
    } else if (!currentState || currentState.folderId !== folderId) {
        // If navigating to a genuinely new folder, push it onto the history
        pushNavigationState(widgetId, newState);
    }
    // If navigating to the same folder (e.g., clicking title twice), do nothing to history


    // --- Update Back Button Visibility ---
    const history = navigationHistory[widgetId] || [];
    // Show back button if:
    // 1. We are NOT in the default folder specified by prefs
    // 2. There is actually a previous state in the history (history length > 1)
    const showBackButton = folderId !== effectiveDefaultFolderId && history.length > 1;

    if (backButton) {
        if (showBackButton) {
            backButton.classList.remove('hidden');
            // Ensure handler is set (or re-set)
            backButton.onclick = () => handleGoBack(widgetId, element, prefs);
        } else {
            backButton.classList.add('hidden');
            backButton.onclick = null; // Remove handler when hidden
        }
    }

    // Render folder content (happens after history/UI updates)
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


    contentElement.innerHTML = '<p>Chargement...</p>'; // Loading indicator

    try {
        const children = await chrome.bookmarks.getChildren(folderId);
        contentElement.innerHTML = ''; // Clear loading/previous content

        // Separate and sort folders and bookmarks
        const folders = children.filter(node => !node.url).sort(compareNodes);
        const bookmarks = children.filter(node => node.url).sort(compareNodes);

        const fragment = document.createDocumentFragment();
        let hasContent = false;

        // Render Folders
        if (folders.length > 0) {
            const folderList = document.createElement('ul');
            folderList.className = `folder-list view-${prefs.view}`; // Apply view class
            folders.forEach(folder => {
                // Pass parentId explicitly, ensure it's string | null
                const parentIdForFolder = folder.parentId ?? null;
                const li = createFolderElement(widgetId, element, folder, parentIdForFolder, prefs);
                folderList.appendChild(li);
            });
            fragment.appendChild(folderList);
            hasContent = true;
        }

        // Render Bookmarks
        if (bookmarks.length > 0) {
            const bookmarkList = document.createElement('ul');
            bookmarkList.className = `bookmark-list view-${prefs.view}`; // Apply view class
            bookmarks.forEach(bookmark => {
                // Pass prefs to createBookmarkElement
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

    } catch (error: any) { // Catch specific error type if possible
        console.error(`Error fetching bookmarks for folder ${folderId}:`, error);
        // Handle specific errors, e.g., folder not found
        if (error.message && error.message.includes('not found')) {
             contentElement.innerHTML = '<p class="error">Dossier non trouvé.</p>';
        } else {
             contentElement.innerHTML = '<p class="error">Erreur lors du chargement des favoris.</p>';
        }
        // Consider navigating back or to default if the current folder is invalid
        // handleInvalidFolderNavigation(widgetId, element, prefs);
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
    parentId: string | null, // Explicitly string | null
    prefs: BookmarkWidgetPreferences
): HTMLLIElement {
    const li = document.createElement('li');
    li.className = 'bookmark-item folder-item';
    const link = document.createElement('a');
    link.href = '#'; // Prevent page jump
    link.title = folderNode.title || 'Dossier sans nom';
    link.dataset.folderId = folderNode.id;
    // link.dataset.parentId = parentId ?? ''; // Store parent ID for navigation if needed, handle null

    link.addEventListener('click', (e) => {
        e.preventDefault();
        // Pass parentId correctly (it's already string | null)
        navigateToFolder(widgetId, widgetElement, folderNode.id, folderNode.title, parentId, prefs);
    });

    const icon = document.createElement('i');
    icon.className = 'fas fa-folder item-icon'; // Font Awesome folder icon
    icon.setAttribute('aria-hidden', 'true'); // Hide decorative icon

    const titleSpan = document.createElement('span');
    titleSpan.className = 'item-title';
    titleSpan.textContent = folderNode.title || 'Dossier sans nom';

    link.appendChild(icon);
    link.appendChild(titleSpan);

    // Show count (conditionally) - Note: requires children to be loaded or fetched separately
    if (prefs.showCount) {
        // Display count if available, otherwise maybe indicate loading or omit
        const count = folderNode.children?.length; // Might be undefined if not loaded by getTree/getChildren
        if (typeof count === 'number') {
             const countSpan = document.createElement('span');
             countSpan.className = 'item-count';
             countSpan.textContent = ` (${count})`;
             countSpan.setAttribute('aria-label', `${count} éléments`);
             link.appendChild(countSpan);
        }
        // else { // Optionally show loading indicator for count }
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
// Removed unused 'prefs' parameter
function createBookmarkElement(bookmarkNode: BookmarkTreeNode, _prefs: BookmarkWidgetPreferences): HTMLLIElement {
    const li = document.createElement('li');
    li.className = 'bookmark-item bookmark-link';
    const link = document.createElement('a');
    const url = bookmarkNode.url || '#'; // Fallback URL
    const title = bookmarkNode.title || url; // Fallback title

    link.href = url;
    // Only open in new tab if it's a valid URL (not '#')
    if (url !== '#') {
        link.target = '_blank';
        link.rel = 'noopener noreferrer'; // Security best practice
    }
    link.title = `${title}\n${url}`; // Tooltip with URL

    // Favicon using Google's service
    const favicon = document.createElement('img');
    favicon.className = 'item-icon favicon';
    favicon.width = 16; // Set explicit size
    favicon.height = 16;
    let domain = '';
    try {
         if (url && url !== '#') {
             domain = new URL(url).hostname;
         }
    } catch (e) {
         console.warn(`Invalid URL for favicon: ${url}`);
    }

    // Only set src if domain is valid
    if (domain) {
        // Use Google favicon service (ensure CSP allows www.google.com)
        favicon.src = `https://www.google.com/s2/favicons?sz=32&domain_url=${encodeURIComponent(domain)}`;
    } else {
         // Set fallback immediately if no domain
         favicon.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="bi bi-file-earmark"><path d="M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5L14 4.5zm-3 0A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5h-2z"/></svg>';
         favicon.style.filter = 'grayscale(1)';
    }

    favicon.alt = ''; // Decorative, title is on link
    favicon.onerror = () => { // Fallback icon if fetch fails or domain is invalid
        // Use a generic SVG icon as fallback
        favicon.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="bi bi-file-earmark"><path d="M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5L14 4.5zm-3 0A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5h-2z"/></svg>'; // Simple file icon
        favicon.style.filter = 'grayscale(1)'; // Indicate it's a fallback
        favicon.onerror = null; // Prevent infinite loop if fallback fails
    };


    const titleSpan = document.createElement('span');
    titleSpan.className = 'item-title';
    // Assign string | null, provide empty string fallback
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
    if (history && history.length > 1) { // Ensure there's a previous state (at least 2 states)
        history.pop(); // Remove current state from the end
        const previousState = history[history.length - 1]; // Get the new last state

        // Navigate to the previous state without pushing to history again
        // Pass parentId from the previous state
        navigateToFolder(widgetId, element, previousState.folderId, previousState.folderName, previousState.parentId, prefs, true); // Treat as refresh
    } else {
        // If history is empty or has only one item, we can't go back
        console.warn(`Cannot go back further for widget ${widgetId}. History:`, history);
        // Ensure back button is hidden (should be handled by navigateToFolder, but double-check)
        const backButton = element.querySelector<HTMLButtonElement>('.widget-back-button');
        backButton?.classList.add('hidden');
    }
}


/** Helper to get the current navigation state */
function getCurrentNavigationState(widgetId: string): NavigationState | null {
     const history = navigationHistory[widgetId];
     // Return the last item if history exists and is not empty
     return (history && history.length > 0) ? history[history.length - 1] : null;
}

/** Helper to push a new state onto the navigation history */
function pushNavigationState(widgetId: string, state: NavigationState): void {
    if (!navigationHistory[widgetId]) {
        navigationHistory[widgetId] = [];
    }
    navigationHistory[widgetId].push(state);
    // Optional: Limit history size?
    // const MAX_HISTORY = 20;
    // if (navigationHistory[widgetId].length > MAX_HISTORY) {
    //     navigationHistory[widgetId].shift(); // Remove oldest entry
    // }
}


/** Comparison function for sorting bookmark nodes alphabetically by title */
function compareNodes(a: BookmarkTreeNode, b: BookmarkTreeNode): number {
    // Use empty string as fallback for comparison
    const titleA = a.title?.toLowerCase() || '';
    const titleB = b.title?.toLowerCase() || '';
    if (titleA < titleB) return -1;
    if (titleA > titleB) return 1;
    // If titles are equal, maybe sort by dateAdded or id? For now, keep original order.
    return 0;
}
