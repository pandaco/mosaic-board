import {
    StoredPreferences,
    BaseWidgetPreferences,
    WidgetType,
    WidgetLayout
} from './types';
import { StorageKey } from './constants';

function getPreferencesKey(widgetType: WidgetType): string {
    switch (widgetType) {
        case WidgetType.Bookmarks: return StorageKey.BookmarkWidgetPrefs;
        case WidgetType.Weather: return StorageKey.WeatherWidgetPrefs;
        case WidgetType.Clock: return StorageKey.ClockWidgetPrefs;
        case WidgetType.Website: return StorageKey.WebsiteWidgetPrefs;
        default:
             const _exhaustiveCheck: never = widgetType;
             console.error(`Unknown widget type for preferences: ${_exhaustiveCheck}`);
             throw new Error(`Unknown widget type for preferences: ${widgetType}`);
    }
}

export async function loadLayout(): Promise<WidgetLayout[]> {
    try {
        const result = await chrome.storage.local.get(StorageKey.DashboardLayout);
        if (chrome.runtime.lastError) {
            console.error("Error loading layout from storage:", chrome.runtime.lastError);
            return [];
        }
        if (result[StorageKey.DashboardLayout] && Array.isArray(result[StorageKey.DashboardLayout])) {
             const validLayout = result[StorageKey.DashboardLayout].filter((item: WidgetLayout) =>
                 item && typeof item.id !== 'undefined' && typeof item.type !== 'undefined'
             );
             if (validLayout.length !== result[StorageKey.DashboardLayout].length) {
                 console.warn("Some invalid layout items were filtered out during load.");
             }
             return validLayout as WidgetLayout[];
        }
        return [];
    } catch (error) {
        console.error("Unexpected error loading dashboard layout:", error);
        return [];
    }
}

export async function saveLayout(layout: WidgetLayout[]): Promise<void> {
    if (!Array.isArray(layout)) {
        console.error("Attempted to save invalid layout:", layout);
        return;
    }
    const validLayout = layout.filter((item: WidgetLayout) =>
         item && typeof item.id === 'string' && typeof item.type === 'string' &&
         typeof item.x === 'number' && typeof item.y === 'number' &&
         typeof item.w === 'number' && typeof item.h === 'number'
    );
     if (validLayout.length !== layout.length) {
         console.warn("Attempted to save layout with invalid items. Filtering invalid items.");
     }

    try {
        await chrome.storage.local.set({ [StorageKey.DashboardLayout]: validLayout });
        if (chrome.runtime.lastError) {
            console.error("Error saving layout to storage:", chrome.runtime.lastError);
        }
    } catch (error) {
        console.error("Unexpected error saving dashboard layout:", error);
    }
}

export async function loadAllPreferences<T extends BaseWidgetPreferences>(
    widgetType: WidgetType
): Promise<StoredPreferences<T>> {
    const key = getPreferencesKey(widgetType);
    try {
        const result = await chrome.storage.local.get(key);
         if (chrome.runtime.lastError) {
            console.error(`Error loading ${widgetType} preferences:`, chrome.runtime.lastError);
            return {};
        }
        return result[key] || {};
    } catch (error) {
        console.error(`Unexpected error loading ${widgetType} preferences:`, error);
        return {};
    }
}

export async function savePreferences<T extends BaseWidgetPreferences>(
    widgetId: string,
    widgetType: WidgetType,
    prefs: T
): Promise<void> {
    if (!widgetId || !prefs) {
        console.error("Invalid arguments for savePreferences:", { widgetId, prefs });
        return;
    }
    const key = getPreferencesKey(widgetType);
    try {
        const result = await chrome.storage.local.get(key);
         if (chrome.runtime.lastError) {
             console.error(`Error getting existing ${widgetType} preferences before saving:`, chrome.runtime.lastError);
             return;
         }
        const existingPrefs = result[key] || {};
        const updatedPrefs = {
            ...existingPrefs,
            [widgetId]: prefs,
        };
        await chrome.storage.local.set({ [key]: updatedPrefs });
         if (chrome.runtime.lastError) {
            console.error(`Error saving ${widgetType} preferences for widget ${widgetId}:`, chrome.runtime.lastError);
        }
    } catch (error) {
        console.error(`Unexpected error saving ${widgetType} preferences for widget ${widgetId}:`, error);
    }
}

export async function deletePreferences(
    widgetId: string,
    widgetType: WidgetType
): Promise<void> {
     if (!widgetId) {
        console.error("Invalid widgetId for deletePreferences");
        return;
    }
    const key = getPreferencesKey(widgetType);
    try {
        const result = await chrome.storage.local.get(key);
         if (chrome.runtime.lastError) {
             console.error(`Error getting existing ${widgetType} preferences before deleting:`, chrome.runtime.lastError);
             return;
         }
        const existingPrefs = result[key] || {};
        if (existingPrefs && typeof existingPrefs === 'object' && existingPrefs[widgetId]) {
            delete existingPrefs[widgetId];
            await chrome.storage.local.set({ [key]: existingPrefs });
             if (chrome.runtime.lastError) {
                 console.error(`Error setting ${widgetType} preferences after deleting key ${widgetId}:`, chrome.runtime.lastError);
             }
        } else {
            console.warn(`Preferences not found for widget ${widgetId} of type ${widgetType} during delete, or storage structure invalid.`);
        }
    } catch (error) {
        console.error(`Unexpected error deleting ${widgetType} preferences for widget ${widgetId}:`, error);
    }
}

export async function getWidgetPreferences<T extends BaseWidgetPreferences>(
    widgetId: string,
    widgetType: WidgetType
): Promise<T | null> {
     if (!widgetId) {
        console.error("Invalid widgetId for getWidgetPreferences");
        return null;
    }
     try {
        const allPrefs = await loadAllPreferences<T>(widgetType);
        if (allPrefs && typeof allPrefs === 'object') {
             return allPrefs[widgetId] || null;
        }
        return null;
    } catch (error) {
        console.error(`Unexpected error getting preferences for widget ${widgetId}:`, error);
        return null;
    }
}
