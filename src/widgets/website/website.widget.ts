import './website.widget.css';
import { WebsiteWidgetPreferences } from '../../types';

const refreshIntervals = new Map<string, number>();

class WebsiteWidget {
    private widgetId: string;
    private element: HTMLElement;
    private prefs: WebsiteWidgetPreferences;
    private iframeContainer: HTMLElement | null;
    private iframe: HTMLIFrameElement | null = null;

    constructor(widgetId: string, element: HTMLElement, initialPrefs: WebsiteWidgetPreferences) {
        this.widgetId = widgetId;
        this.element = element;
        this.prefs = initialPrefs;
        this.iframeContainer = this.element.querySelector<HTMLElement>('.iframe-container');
        this.init();
    }

    private init(): void {
        console.log(`Initializing Website Widget ${this.widgetId} with prefs:`, this.prefs);
        this.loadIframe();
    }

    updatePreferences(newPrefs: WebsiteWidgetPreferences): void {
        console.log(`Updating Website Widget ${this.widgetId} with prefs:`, newPrefs);
        this.prefs = newPrefs;
        this.loadIframe();
    }

    private displayWidgetError(message: string): void {
        const errorElement = this.element.querySelector<HTMLElement>('.error-message');
        const placeholder = this.element.querySelector<HTMLElement>('.placeholder-message');
        if (placeholder) placeholder.classList.add('hidden');
        if (this.iframe) this.iframe.style.display = 'none';
        if (errorElement) {
            errorElement.textContent = message || 'An error occurred.';
            errorElement.classList.remove('hidden');
        }
    }

    private showPlaceholder(): void {
         const errorElement = this.element.querySelector<HTMLElement>('.error-message');
         const placeholder = this.element.querySelector<HTMLElement>('.placeholder-message');
         if (this.iframe) this.iframe.style.display = 'none';
         if (errorElement) errorElement.classList.add('hidden');
         if (placeholder) placeholder.classList.remove('hidden');
    }

    private showIframe(): void {
        const errorElement = this.element.querySelector<HTMLElement>('.error-message');
        const placeholder = this.element.querySelector<HTMLElement>('.placeholder-message');
        if (placeholder) placeholder.classList.add('hidden');
        if (errorElement) errorElement.classList.add('hidden');
        if (this.iframe) this.iframe.style.display = 'block';
    }

    private cleanupRefreshInterval(): void {
         if (refreshIntervals.has(this.widgetId)) {
            clearInterval(refreshIntervals.get(this.widgetId));
            refreshIntervals.delete(this.widgetId);
            console.log(`Cleared refresh interval for ${this.widgetId}`);
        }
    }

    private applyOffset(iframe: HTMLIFrameElement, top: number, left: number): void {
        iframe.style.transform = `translate(${-left}px, ${-top}px)`;
    }

    private loadIframe(): void {
        if (!this.iframeContainer) return;

        this.cleanupRefreshInterval();

        const existingIframe = this.iframeContainer.querySelector('iframe');
        if (existingIframe) existingIframe.remove();
        this.iframe = null;

        if (!this.prefs.url || !this.prefs.url.startsWith('http')) {
            if (!this.prefs.url) this.showPlaceholder();
            else this.displayWidgetError('Invalid URL format. Please start with http:// or https://');
            return;
        }

        this.iframe = document.createElement('iframe');
        this.iframe.setAttribute('src', this.prefs.url);
        this.iframe.setAttribute('frameborder', '0');
        this.iframe.setAttribute('title', `Embedded content from ${this.prefs.url}`);
        this.iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups allow-forms');

        this.applyOffset(this.iframe, this.prefs.offsetTop, this.prefs.offsetLeft);

        this.iframe.addEventListener('load', () => {
            console.log(`Iframe for ${this.widgetId} loaded: ${this.prefs.url}`);
            this.showIframe();
        });
        this.iframe.addEventListener('error', (e) => {
             console.error(`Error loading iframe source for ${this.widgetId}: ${this.prefs.url}`, e);
             this.displayWidgetError(`Error loading ${this.prefs.url}. Check URL/connection.`);
        });

        this.iframeContainer.appendChild(this.iframe);

        if (this.prefs.refreshInterval > 0) {
            const intervalId = setInterval(() => {
                if (this.iframe) {
                    console.log(`Refreshing iframe for ${this.widgetId}: ${this.prefs.url}`);
                    this.iframe.src = this.iframe.src;
                } else {
                    this.cleanupRefreshInterval();
                }
            }, this.prefs.refreshInterval);
            refreshIntervals.set(this.widgetId, intervalId);
        }
    }

    cleanup(): void {
        console.log(`Cleaning up Website Widget ${this.widgetId}`);
        this.cleanupRefreshInterval();
    }
}

export function initWebsiteWidget(id: string, element: HTMLElement, prefs: WebsiteWidgetPreferences): void {
    new WebsiteWidget(id, element, prefs);
}

export function updateWebsiteWidgetPreferences(id: string, prefs: WebsiteWidgetPreferences): void {

    const widgetContainer = document.getElementById(id);
    const element = widgetContainer?.querySelector<HTMLElement>('.grid-stack-item-content');
    if (element) {
        console.warn(`Re-initializing WebsiteWidget ${id} due to preference update.`);
        new WebsiteWidget(id, element, prefs);
    }
}

export function cleanupWebsiteWidget(widgetId: string): void {
    if (refreshIntervals.has(widgetId)) {
        clearInterval(refreshIntervals.get(widgetId));
        refreshIntervals.delete(widgetId);
    }
    console.log(`Cleaned up intervals for Website Widget ${widgetId}`);
}
