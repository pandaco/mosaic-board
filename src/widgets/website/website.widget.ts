// Renamed import path and type name
import './website.widget.css';
import { WebsiteWidgetPreferences } from '../../types';

const refreshIntervalMap = new Map<string, number>();

/** Helper to display error messages */
function displayEmbedError(element: HTMLElement, message: string): void {
    const errorElement = element.querySelector<HTMLElement>('.error-message');
    const iframeContainer = element.querySelector<HTMLElement>('.iframe-container iframe');
    const placeholder = element.querySelector<HTMLElement>('.placeholder-message');

    if (placeholder) placeholder.classList.add('hidden');
    if (iframeContainer) iframeContainer.style.display = 'none';

    if (errorElement) {
        errorElement.textContent = message || 'An error occurred.';
        errorElement.classList.remove('hidden');
    }
}

/** Helper to show the placeholder message */
function showPlaceholder(element: HTMLElement): void {
     const errorElement = element.querySelector<HTMLElement>('.error-message');
     const iframeContainer = element.querySelector<HTMLElement>('.iframe-container iframe');
     const placeholder = element.querySelector<HTMLElement>('.placeholder-message');

     if (iframeContainer) iframeContainer.style.display = 'none';
     if (errorElement) errorElement.classList.add('hidden');
     if (placeholder) placeholder.classList.remove('hidden');
}

/** Helper to show the iframe */
function showIframe(element: HTMLElement): void {
    const errorElement = element.querySelector<HTMLElement>('.error-message');
    const iframeContainer = element.querySelector<HTMLElement>('.iframe-container iframe');
    const placeholder = element.querySelector<HTMLElement>('.placeholder-message');

    if (placeholder) placeholder.classList.add('hidden');
    if (errorElement) errorElement.classList.add('hidden');
    if (iframeContainer) iframeContainer.style.display = 'block';
}


/** Cleans up the refresh interval */
function cleanupRefreshInterval(widgetId: string): void {
     if (refreshIntervalMap.has(widgetId)) {
        clearInterval(refreshIntervalMap.get(widgetId));
        refreshIntervalMap.delete(widgetId);
        console.log(`Cleared refresh interval for ${widgetId}`);
    }
}

/** Applies styles for offset */
function applyOffset(iframe: HTMLIFrameElement, top: number, left: number) {
    iframe.style.transform = `translate(${-left}px, ${-top}px)`;
}

/** Loads or reloads the iframe content */
function loadIframe(widgetId: string, element: HTMLElement, prefs: WebsiteWidgetPreferences): void {
    const iframeContainer = element.querySelector<HTMLElement>('.iframe-container');
    if (!iframeContainer) return;

    cleanupRefreshInterval(widgetId);

    const existingIframe = iframeContainer.querySelector('iframe');
    if (existingIframe) {
        existingIframe.remove();
    }

    if (!prefs.url || !prefs.url.startsWith('http')) {
        if (!prefs.url) {
             showPlaceholder(element);
        } else {
             displayEmbedError(element, 'Invalid URL format. Please start with http:// or https://');
        }
        return;
    }

    const iframe = document.createElement('iframe');
    iframe.setAttribute('src', prefs.url);
    iframe.setAttribute('frameborder', '0');
    iframe.setAttribute('title', `Embedded content from ${prefs.url}`);
    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups allow-forms');

    applyOffset(iframe, prefs.offsetTop, prefs.offsetLeft);

    iframe.addEventListener('load', () => {
        console.log(`Iframe for ${widgetId} loaded: ${prefs.url}`);
         showIframe(element);
    });

     iframe.addEventListener('error', (e) => {
         console.error(`Error loading iframe source for ${widgetId}: ${prefs.url}`, e);
         displayEmbedError(element, `Error loading ${prefs.url}. Check the URL and network connection.`);
     });

    iframeContainer.appendChild(iframe);


    if (prefs.refreshInterval > 0) {
        const intervalId = setInterval(() => {
            console.log(`Refreshing iframe for ${widgetId}: ${prefs.url}`);
            iframe.src = iframe.src;
        }, prefs.refreshInterval);
        refreshIntervalMap.set(widgetId, intervalId);
    }
}


/**
 * Initializes the Website widget instance.
 * Renamed function
 */
export function initWebsiteWidget(widgetId: string, element: HTMLElement, prefs: WebsiteWidgetPreferences): void {
    console.log(`Initializing Website Widget ${widgetId} with prefs:`, prefs);
    loadIframe(widgetId, element, prefs);
}

/**
 * Updates the Website widget display based on new preferences.
 * Renamed function
 */
export function updateWebsiteWidgetPreferences(widgetId: string, prefs: WebsiteWidgetPreferences): void {
    console.log(`Updating Website Widget ${widgetId} with prefs:`, prefs);
    const widgetContainer = document.getElementById(widgetId);
    const widgetElement = widgetContainer?.querySelector<HTMLElement>('.grid-stack-item-content');

    if (widgetElement) {
        loadIframe(widgetId, widgetElement, prefs);
    } else {
         console.warn(`Could not find content element for website widget ${widgetId} during preference update.`);
    }
}

/**
 * Cleans up intervals associated with a specific website widget instance.
 * Renamed function
 */
export function cleanupWebsiteWidget(widgetId: string): void {
    console.log(`Cleaning up Website Widget ${widgetId}`);
    cleanupRefreshInterval(widgetId);
}
