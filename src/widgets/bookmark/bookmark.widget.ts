import './bookmark.widget.css';
import { BookmarkWidgetPreferences, BookmarkTreeNode } from '../../types';

interface NavigationState {
    folderId: string;
    folderName: string;
    parentId: string | null;
}

export class BookmarkWidget {

    private element: HTMLElement;
    private prefs: BookmarkWidgetPreferences;
    private navigationHistory: NavigationState[] = [];

    constructor(widgetId: string, element: HTMLElement, initialPrefs: BookmarkWidgetPreferences) {

        this.element = element;
        this.prefs = initialPrefs;

        console.log(`BookmarkWidget initialized with ID (unused internally): ${widgetId}`);
        this.init();
    }

    private init(): void {
        this.navigationHistory = [];
        const defaultFolderId = this.prefs.defaultFolderId || '1';

        try {

            chrome.bookmarks.get(defaultFolderId, (nodes) => {
                if (chrome.runtime.lastError || !nodes || nodes.length === 0) {
                    console.warn(`Default folder (${defaultFolderId}) not found or error: ${chrome.runtime.lastError?.message}. Falling back to root.`);

                    this.navigateToFolder('0', 'Bookmarks Bar', null, true);
                    return;
                }

                const initialNode = nodes[0];
                const initialFolderName = initialNode.title || `Folder ${defaultFolderId}`;
                const initialParentId = initialNode.parentId ?? null;

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

        if (oldDefaultFolderId !== newPrefs.defaultFolderId) {
            console.log('Default folder changed, re-initializing navigation.');
            this.init();
        } else {

            const currentState = this.getCurrentNavigationState();
            if (currentState) {
                console.log('Refreshing current folder view due to preference update.');
                this.renderFolderContents(currentState.folderId);
            } else {

                console.log('No current state found, re-initializing navigation.');
                this.init();
            }
        }
    }

    private navigateToFolder(folderId: string, folderName: string, parentId: string | null, isInitialLoadOrRefresh: boolean = false): void {
        const titleElement = this.element.querySelector<HTMLElement>('.widget-title');
        const backButton = this.element.querySelector<HTMLButtonElement>('.widget-back-button');
        const effectiveDefaultFolderId = this.prefs.defaultFolderId || '1';

        console.log(`Navigating to folder: ${folderName} (ID: ${folderId}), ParentID: ${parentId}, Initial/Refresh: ${isInitialLoadOrRefresh}`);

        if (titleElement) {
            const displayTitle = folderName || (folderId === '0' ? 'Bookmarks Bar' : 'Bookmarks');
            titleElement.textContent = displayTitle;
            titleElement.title = displayTitle;
            titleElement.onclick = null;
            titleElement.style.cursor = 'default';

            if (folderId !== '0' && folderId !== effectiveDefaultFolderId && parentId && parentId !== '0') {

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

        const currentState = this.getCurrentNavigationState();
        const newState: NavigationState = { folderId, folderName, parentId };

        if (isInitialLoadOrRefresh) {

            this.navigationHistory = [newState];
        } else if (!currentState || currentState.folderId !== folderId) {

            this.pushNavigationState(newState);
        }
         console.log('Navigation History:', [...this.navigationHistory]);

        const showBackButton = folderId !== '0' && this.navigationHistory.length > 1;
        if (backButton) {
            backButton.classList.toggle('hidden', !showBackButton);
            backButton.onclick = showBackButton ? () => this.handleGoBack() : null;
            console.log(`Back button visibility: ${showBackButton}`);
        }

        this.renderFolderContents(folderId);
    }

    private async renderFolderContents(folderId: string): Promise<void> {
        const contentElement = this.element.querySelector<HTMLElement>('.widget-content');
        if (!contentElement) {
            console.error('Widget content element not found.');
            return;
        }

        contentElement.innerHTML = '<p class="loading-message">Loading...</p>';

        try {
            chrome.bookmarks.getChildren(folderId, (children) => {
                 if (chrome.runtime.lastError) {
                    console.error(`Error loading children for folder ${folderId}:`, chrome.runtime.lastError.message);
                    this.displayWidgetError(`Error loading folder contents.`);
                    return;
                }

                contentElement.innerHTML = '';
                const fragment = document.createDocumentFragment();

                const folders = children.filter(node => !node.url).sort(this.compareNodes);
                const bookmarks = children.filter(node => node.url).sort(this.compareNodes);

                const hasContent = folders.length > 0 || bookmarks.length > 0;

                if (hasContent) {
                    const combinedList = document.createElement('ul');
                    combinedList.className = `bookmark-list view-${this.prefs.view || 'list'}`;
                    combinedList.setAttribute('role', 'list');
                    
                    folders.forEach(folder => {
                        const li = this.createFolderElement(folder, folderId);
                        combinedList.appendChild(li);
                    });
                    
                    bookmarks.forEach(bookmark => {
                        const li = this.createBookmarkElement(bookmark);
                        combinedList.appendChild(li);
                    });
                    
                    fragment.appendChild(combinedList);
                    contentElement.appendChild(fragment);
                } else {
                    contentElement.innerHTML = '<p class="empty-folder">This folder is empty.</p>';
                }
            });
        } catch (error: any) {
             console.error("Unexpected error rendering folder contents:", error);
             this.displayWidgetError("Unexpected error.");
        }
    }

    private createFolderElement(folderNode: BookmarkTreeNode, parentId: string | null): HTMLLIElement {
        const li = document.createElement('li');
        li.className = 'bookmark-item folder-item';
        li.setAttribute('role', 'listitem');

        const link = document.createElement('a');
        link.href = '#';
        const folderTitle = folderNode.title || 'Unnamed folder';
        link.title = folderTitle;
        link.dataset.folderId = folderNode.id;
        link.setAttribute('role', 'button');
        link.setAttribute('aria-label', `Folder: ${folderTitle}`);

        link.addEventListener('click', (e) => {
            e.preventDefault();
            this.navigateToFolder(folderNode.id, folderNode.title, parentId);
        });

        link.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.navigateToFolder(folderNode.id, folderNode.title, parentId);
            }
        });

        const icon = document.createElement('i');
        icon.className = 'fas fa-folder item-icon';
        icon.setAttribute('aria-hidden', 'true');

        const titleContainer = document.createElement('span');
        titleContainer.className = 'item-title-container';

        const titleSpan = document.createElement('span');
        titleSpan.className = 'item-title';
        titleSpan.textContent = folderTitle;

        titleContainer.appendChild(titleSpan);

        link.appendChild(icon);
        link.appendChild(titleContainer);

        if (this.prefs.showCount) {

             if (folderNode.children) {
                 const count = folderNode.children.length;
                 const countSpan = document.createElement('span');
                 countSpan.className = 'item-count';
                 countSpan.textContent = ` (${count})`;
                 countSpan.setAttribute('aria-label', `${count} items`);
                 titleContainer.appendChild(countSpan);
             } else {

                 chrome.bookmarks.getChildren(folderNode.id, (children) => {
                     if (!chrome.runtime.lastError) {
                         const count = children.length;
                         const countSpan = document.createElement('span');
                         countSpan.className = 'item-count';
                         countSpan.textContent = ` (${count})`;
                         countSpan.setAttribute('aria-label', `${count} items`);

                         if (li.contains(link)) {
                            titleContainer.appendChild(countSpan);
                         }
                     }
                 });
             }
        }

        li.appendChild(link);
        return li;
    }

    private createBookmarkElement(bookmarkNode: BookmarkTreeNode): HTMLLIElement {
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
        favicon.alt = '';

        let domain = '';
        try {
            if (url && url !== '#') {
                domain = new URL(url).hostname;
            }
        } catch (e) {
            console.warn(`Invalid URL for favicon: ${url}`);
        }

        const fallbackSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"><defs><linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#667eea;stop-opacity:1"/><stop offset="100%" style="stop-color:#764ba2;stop-opacity:1"/></linearGradient></defs><rect x="3" y="2" width="18" height="20" rx="2" fill="url(#grad1)" opacity="0.1"/><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" fill="url(#grad1)"/></svg>`;
        const fallbackSvgDataUri = `data:image/svg+xml,${encodeURIComponent(fallbackSvg)}`;

        const faviconSource = this.prefs.faviconSource || 'default';

        if (faviconSource === 'google' && domain) {
            favicon.src = `https://www.google.com/s2/favicons?sz=32&domain_url=${encodeURIComponent(domain)}`;
            favicon.onerror = () => {
                favicon.src = fallbackSvgDataUri;
                favicon.onerror = null;
            };
        } else {
            favicon.src = fallbackSvgDataUri;
        }

        const titleSpan = document.createElement('span');
        titleSpan.className = 'item-title';
        titleSpan.textContent = title;

        link.appendChild(favicon);
        link.appendChild(titleSpan);
        li.appendChild(link);
        return li;
    }

    private handleGoBack(): void {
        console.log('Handling Go Back. Current history length:', this.navigationHistory.length);
        if (this.navigationHistory && this.navigationHistory.length > 1) {
            this.navigationHistory.pop();
            const previousState = this.navigationHistory[this.navigationHistory.length - 1];
            console.log('Navigating back to:', previousState);

            this.navigateToFolder(previousState.folderId, previousState.folderName, previousState.parentId, true);
        } else {

            console.log('Cannot go back further.');
            const backButton = this.element.querySelector<HTMLButtonElement>('.widget-back-button');
            backButton?.classList.add('hidden');
        }
    }

    private getCurrentNavigationState(): NavigationState | null {
         return (this.navigationHistory && this.navigationHistory.length > 0)
             ? this.navigationHistory[this.navigationHistory.length - 1]
             : null;
    }

    private pushNavigationState(state: NavigationState): void {
        if (!this.navigationHistory) {
            this.navigationHistory = [];
        }
        this.navigationHistory.push(state);
    }

    private compareNodes(a: BookmarkTreeNode, b: BookmarkTreeNode): number {
        const titleA = a.title?.toLowerCase() || '';
        const titleB = b.title?.toLowerCase() || '';
        if (titleA < titleB) return -1;
        if (titleA > titleB) return 1;
        return 0;
    }

     private displayWidgetError(message: string): void {
        const contentElement = this.element.querySelector<HTMLElement>('.widget-content');
        if (contentElement) {
            contentElement.innerHTML = `<p class="error">${message || 'An error occurred.'}</p>`;
        }
    }
}

export function initBookmarkWidget(id: string, element: HTMLElement, prefs: BookmarkWidgetPreferences): void {
    new BookmarkWidget(id, element, prefs);
}

export function updateBookmarkWidgetPreferences(id: string, prefs: BookmarkWidgetPreferences): void {
    const widgetContainer = document.getElementById(id);
    const element = widgetContainer?.querySelector<HTMLElement>('.grid-stack-item-content');
    if (element) {

        console.warn(`Re-initializing BookmarkWidget ${id} due to preference update.`);
        new BookmarkWidget(id, element, prefs);
    } else {
         console.error(`Could not find element for BookmarkWidget ${id} to update preferences.`);
    }
}
