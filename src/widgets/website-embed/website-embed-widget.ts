// Corrected import path
import './website-embed-widget.css';
import { WebsiteEmbedWidgetPreferences } from '../../types';

// Store interval IDs per widget instance
const refreshIntervalMap = new Map<string, number>();

/** Helper to display error messages within the widget content area */
function displayEmbedError(element: HTMLElement, message: string): void {
    const errorElement = element.querySelector<HTMLElement>('.error-message');
    const iframeContainer = element.querySelector<HTMLElement>('.iframe-container iframe'); // Find existing iframe if any
    const placeholder = element.querySelector<HTMLElement>('.placeholder-message');

    if (placeholder) placeholder.classList.add('hidden'); // Hide placeholder
    if (iframeContainer) iframeContainer.style.display = 'none'; // Hide iframe

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
    if (iframeContainer) iframeContainer.style.display = 'block'; // Show iframe
}


/** Cleans up the refresh interval for a specific widget */
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
function loadIframe(widgetId: string, element: HTMLElement, prefs: WebsiteEmbedWidgetPreferences): void {
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
    // Don't show immediately, wait for load event (or error)
    // showIframe(element);


    if (prefs.refreshInterval > 0) {
        const intervalId = setInterval(() => {
            console.log(`Refreshing iframe for ${widgetId}: ${prefs.url}`);
            iframe.src = iframe.src; // Simple reload by resetting src
            // Re-apply offset might not be necessary unless the page itself resets scroll on reload
            // applyOffset(iframe, prefs.offsetTop, prefs.offsetLeft);
        }, prefs.refreshInterval);
        refreshIntervalMap.set(widgetId, intervalId);
    }
}


/**
 * Initializes the Website Embed widget instance.
 */
 // Corrected function name
export function initWebsiteEmbedWidget(widgetId: string, element: HTMLElement, prefs: WebsiteEmbedWidgetPreferences): void {
    console.log(`Initializing Website Embed Widget ${widgetId} with prefs:`, prefs);
    loadIframe(widgetId, element, prefs);
}

/**
 * Updates the Website Embed widget display based on new preferences.
 */
 // Corrected function name
export function updateWebsiteEmbedWidgetPreferences(widgetId: string, prefs: WebsiteEmbedWidgetPreferences): void {
    console.log(`Updating Website Embed Widget ${widgetId} with prefs:`, prefs);
    const widgetContainer = document.getElementById(widgetId);
    const widgetElement = widgetContainer?.querySelector<HTMLElement>('.grid-stack-item-content');

    if (widgetElement) {
        loadIframe(widgetId, widgetElement, prefs);
    } else {
         console.warn(`Could not find content element for website embed widget ${widgetId} during preference update.`);
    }
}

/**
 * Cleans up intervals associated with a specific website embed widget instance.
 */
 // Corrected function name
export function cleanupWebsiteEmbedWidget(widgetId: string): void {
    console.log(`Cleaning up Website Embed Widget ${widgetId}`);
    cleanupRefreshInterval(widgetId);
}
