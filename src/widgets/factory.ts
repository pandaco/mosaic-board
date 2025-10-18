import { WidgetType, BaseWidgetPreferences } from '../types';

export function createWidgetElement(id: string, type: WidgetType): HTMLElement | null {
    const templateId = `${type}-widget-template`;
    const template = document.getElementById(templateId) as HTMLTemplateElement | null;

    if (!template) {
        console.error(`Template not found for widget type: ${type} (expected ID: ${templateId})`);
        return null;
    }

    const widgetContainer = document.createElement('div');
    widgetContainer.id = id;
    widgetContainer.dataset.widgetType = type;

    const contentFragment = template.content.cloneNode(true) as DocumentFragment;
    const widgetContentElement = contentFragment.querySelector('.grid-stack-item-content');

    if (!widgetContentElement) {
         console.error(`Template for ${type} is missing the .grid-stack-item-content element.`);
         return null;
    }

    widgetContainer.appendChild(contentFragment);

    return widgetContainer;
}

export function getDefaultPreferences(type: WidgetType): BaseWidgetPreferences | null {
    switch (type) {
        case WidgetType.Bookmarks:
            return { view: 'list', showCount: false, defaultFolderId: '1', faviconSource: 'default' };
        case WidgetType.Weather:
            return { location: 'Lille', unit: 'metric' };
        case WidgetType.Clock:
            return { showStopwatch: false };
        case WidgetType.Website:
            return { url: '', refreshInterval: 0, offsetTop: 0, offsetLeft: 0 };
        default:
             const _exhaustiveCheck: never = type;
             console.warn(`No default preferences defined for widget type: ${_exhaustiveCheck}`);
            return null;
    }
}
