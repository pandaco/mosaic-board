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

        const titleSpan = document.createElement('span');
        titleSpan.className = 'item-title';
        titleSpan.textContent = folderTitle;

        link.appendChild(icon);
        link.appendChild(titleSpan);

        if (this.prefs.showCount) {

             if (folderNode.children) {
                 const count = folderNode.children.length;
                 const countSpan = document.createElement('span');
                 countSpan.className = 'item-count';
                 countSpan.textContent = ` (${count})`;
                 countSpan.setAttribute('aria-label', `${count} items`);
                 link.appendChild(countSpan);
             } else {

                 chrome.bookmarks.getChildren(folderNode.id, (children) => {
                     if (!chrome.runtime.lastError) {
                         const count = children.length;
                         const countSpan = document.createElement('span');
                         countSpan.className = 'item-count';
                         countSpan.textContent = ` (${count})`;
                         countSpan.setAttribute('aria-label', `${count} items`);

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

        const fallbackSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="bi bi-globe"><path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm7.5-6.923c-.67.204-1.335.82-1.887 1.855A7.97 7.97 0 0 0 5.145 4H7.5V1.077zM4.09 4a9.267 9.267 0 0 1 .64-1.539 6.7 6.7 0 0 1 .597-.933A7.025 7.025 0 0 0 2.255 4H4.09zm-.582 3.5c.03-.877.138-1.718.312-2.5H1.674a6.958 6.958 0 0 0-.656 2.5h2.49zM4.847 5a12.5 12.5 0 0 0-.338 2.5H7.5V5H4.847zM8.5 5v2.5h2.99a12.495 12.495 0 0 0-.337-2.5H8.5zM4.51 8.5a12.5 12.5 0 0 0 .337 2.5H7.5V8.5H4.51zm3.99 0V11h2.653c.187-.765.306-1.608.338-2.5H8.5zM5.145 12c.138.386.295.744.468 1.068.552 1.035 1.218 1.65 1.887 1.855V12H5.145zm.182 2.472a6.696 6.696 0 0 1-.597-.933A9.268 9.268 0 0 1 4.09 12H2.255a7.024 7.024 0 0 0 3.072 2.472zM3.82 11a13.652 13.652 0 0 1-.312-2.5h-2.49c.062.89.291 1.733.656 2.5H3.82zm6.853 3.472A7.024 7.024 0 0 0 13.745 12H11.91a9.27 9.27 0 0 1-.64 1.539 6.688 6.688 0 0 1-.597.933zM8.5 12h2.855c.173-.324.33-.682.468-1.068.552-1.035 1.218-1.65 1.887-1.855V12H8.5zm3.68-1h2.49a6.959 6.959 0 0 0-.656-2.5H12.18c.03.877.138 1.718.312 2.5zM11.91 4a9.27 9.27 0 0 1 .64-1.539 6.688 6.688 0 0 1 .597-.933A7.025 7.025 0 0 0 13.745 4H11.91zm-.468 2.5c-.138-.386-.295-.744-.468-1.068-.552-1.035-1.218-1.65-1.887-1.855V5H11.44z"/></svg>`;
        const fallbackSvgDataUri = `data:image/svg+xml,${encodeURIComponent(fallbackSvg)}`;

        if (domain) {
            favicon.src = `https://www.google.com/s2/favicons?sz=32&domain_url=${encodeURIComponent(domain)}`;
        } else {
            favicon.src = fallbackSvgDataUri;
            favicon.style.filter = 'grayscale(1)';
        }

        favicon.onerror = () => {
            favicon.src = fallbackSvgDataUri;
            favicon.style.filter = 'grayscale(1)';
            favicon.onerror = null;
        };

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
