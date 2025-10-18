import './bookmark.widget.css';
import { BookmarkWidgetPreferences, BookmarkTreeNode } from '../../types';
import {
    BookmarkFolderId,
    BOOKMARK_ICON_SIZE,
    BookmarkFaviconSource,
    CssClass,
    USER_MESSAGES,
    KeyboardKey,
    AriaRole,
    ARIA_HIDDEN,
    WEATHER_CONFIG,
} from '../../constants';

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
        const defaultFolderId = this.prefs.defaultFolderId || BookmarkFolderId.Default;

        try {

            chrome.bookmarks.get(defaultFolderId, (nodes) => {
                if (chrome.runtime.lastError || !nodes || nodes.length === 0) {
                    console.warn(`Default folder (${defaultFolderId}) not found or error: ${chrome.runtime.lastError?.message}. Falling back to root.`);

                    this.navigateToFolder(BookmarkFolderId.Root, 'Bookmarks Bar', null, true);
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
        const titleElement = this.element.querySelector<HTMLElement>(`.${CssClass.WidgetTitle}`);
        const backButton = this.element.querySelector<HTMLButtonElement>(`.${CssClass.WidgetBackButton}`);
        const effectiveDefaultFolderId = this.prefs.defaultFolderId || BookmarkFolderId.Default;

        console.log(`Navigating to folder: ${folderName} (ID: ${folderId}), ParentID: ${parentId}, Initial/Refresh: ${isInitialLoadOrRefresh}`);

        if (titleElement) {
            const displayTitle = folderName || (folderId === BookmarkFolderId.Root ? 'Bookmarks Bar' : 'Bookmarks');
            titleElement.textContent = displayTitle;
            titleElement.title = displayTitle;
            titleElement.onclick = null;
            titleElement.style.cursor = 'default';

            if (folderId !== BookmarkFolderId.Root && folderId !== effectiveDefaultFolderId && parentId && parentId !== BookmarkFolderId.Root) {

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

        const showBackButton = folderId !== BookmarkFolderId.Root && this.navigationHistory.length > 1;
        if (backButton) {
            backButton.classList.toggle(CssClass.Hidden, !showBackButton);
            backButton.onclick = showBackButton ? () => this.handleGoBack() : null;
            console.log(`Back button visibility: ${showBackButton}`);
        }

        this.renderFolderContents(folderId);
    }

    private async renderFolderContents(folderId: string): Promise<void> {
        const contentElement = this.element.querySelector<HTMLElement>(`.${CssClass.WidgetContent}`);
        if (!contentElement) {
            console.error('Widget content element not found.');
            return;
        }

        contentElement.innerHTML = `<p class="${CssClass.LoadingMessage}">${USER_MESSAGES.LOADING}</p>`;

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
                    combinedList.className = `${CssClass.BookmarkList} view-${this.prefs.view || 'list'}`;
                    combinedList.setAttribute('role', AriaRole.List);
                    
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
                    contentElement.innerHTML = `<p class="${CssClass.EmptyFolder}">${USER_MESSAGES.EMPTY_FOLDER}</p>`;
                }
            });
        } catch (error: any) {
             console.error("Unexpected error rendering folder contents:", error);
             this.displayWidgetError("Unexpected error.");
        }
    }

    private createFolderElement(folderNode: BookmarkTreeNode, parentId: string | null): HTMLLIElement {
        const li = document.createElement('li');
        li.className = `${CssClass.BookmarkItem} ${CssClass.FolderItem}`;
        li.setAttribute('role', AriaRole.Listitem);

        const link = document.createElement('a');
        link.href = '#';
        const folderTitle = folderNode.title || 'Unnamed folder';
        link.title = folderTitle;
        link.dataset.folderId = folderNode.id;
        link.setAttribute('role', AriaRole.Button);
        link.setAttribute('aria-label', `Folder: ${folderTitle}`);

        link.addEventListener('click', (e) => {
            e.preventDefault();
            this.navigateToFolder(folderNode.id, folderNode.title, parentId);
        });

        link.addEventListener('keydown', (e) => {
            if (e.key === KeyboardKey.Enter || e.key === KeyboardKey.Space) {
                e.preventDefault();
                this.navigateToFolder(folderNode.id, folderNode.title, parentId);
            }
        });

        const icon = document.createElement('i');
        icon.className = `fas fa-folder ${CssClass.ItemIcon}`;
        icon.setAttribute('aria-hidden', ARIA_HIDDEN);

        const titleContainer = document.createElement('span');
        titleContainer.className = CssClass.ItemTitleContainer;

        const titleSpan = document.createElement('span');
        titleSpan.className = CssClass.ItemTitle;
        titleSpan.textContent = folderTitle;

        titleContainer.appendChild(titleSpan);

        link.appendChild(icon);
        link.appendChild(titleContainer);

        if (this.prefs.showCount) {

             if (folderNode.children) {
                 const count = folderNode.children.length;
                 const countSpan = document.createElement('span');
                 countSpan.className = CssClass.ItemCount;
                 countSpan.textContent = ` (${count})`;
                 countSpan.setAttribute('aria-label', `${count} items`);
                 titleContainer.appendChild(countSpan);
             } else {

                 chrome.bookmarks.getChildren(folderNode.id, (children) => {
                     if (!chrome.runtime.lastError) {
                         const count = children.length;
                         const countSpan = document.createElement('span');
                         countSpan.className = CssClass.ItemCount;
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
        li.className = `${CssClass.BookmarkItem} ${CssClass.BookmarkLink}`;
        li.setAttribute('role', AriaRole.Listitem);

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
        favicon.className = `${CssClass.ItemIcon} ${CssClass.Favicon}`;
        favicon.width = BOOKMARK_ICON_SIZE.WIDTH;
        favicon.height = BOOKMARK_ICON_SIZE.HEIGHT;
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

        const faviconSource = this.prefs.faviconSource || BookmarkFaviconSource.Default;

        if (faviconSource === BookmarkFaviconSource.Google && domain) {
            favicon.src = `${WEATHER_CONFIG.GOOGLE_FAVICON_BASE_URL}?sz=${WEATHER_CONFIG.GOOGLE_FAVICON_SIZE}&domain_url=${encodeURIComponent(domain)}`;
            favicon.onerror = () => {
                favicon.src = fallbackSvgDataUri;
                favicon.onerror = null;
            };
        } else {
            favicon.src = fallbackSvgDataUri;
        }

        const titleSpan = document.createElement('span');
        titleSpan.className = CssClass.ItemTitle;
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
            const backButton = this.element.querySelector<HTMLButtonElement>(`.${CssClass.WidgetBackButton}`);
            backButton?.classList.add(CssClass.Hidden);
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
        const contentElement = this.element.querySelector<HTMLElement>(`.${CssClass.WidgetContent}`);
        if (contentElement) {
            contentElement.innerHTML = `<p class="${CssClass.Error}">${message || USER_MESSAGES.ERROR_GENERIC}</p>`;
        }
    }
}

export function initBookmarkWidget(id: string, element: HTMLElement, prefs: BookmarkWidgetPreferences): void {
    new BookmarkWidget(id, element, prefs);
}

export function updateBookmarkWidgetPreferences(id: string, prefs: BookmarkWidgetPreferences): void {
    const widgetContainer = document.getElementById(id);
    const element = widgetContainer?.querySelector<HTMLElement>(`.${CssClass.GridStackItemContent}`);
    if (element) {

        console.warn(`Re-initializing BookmarkWidget ${id} due to preference update.`);
        new BookmarkWidget(id, element, prefs);
    } else {
         console.error(`Could not find element for BookmarkWidget ${id} to update preferences.`);
    }
}
