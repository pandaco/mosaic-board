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

function isValidLayoutItem(item: WidgetLayout): boolean {
    return !!(item && typeof item.id !== 'undefined' && typeof item.type !== 'undefined');
}

function filterInvalidLayoutItems(layoutItems: WidgetLayout[]): WidgetLayout[] {
    const validLayout = layoutItems.filter(isValidLayoutItem);
    
    if (validLayout.length !== layoutItems.length) {
        console.warn("Some invalid layout items were filtered out during load.");
    }
    
    return validLayout;
}

function handleStorageError(operation: string, error: unknown): void {
    console.error(`Error ${operation} from storage:`, error);
}

export async function loadLayout(): Promise<WidgetLayout[]> {
    try {
        const result = await chrome.storage.local.get(StorageKey.DashboardLayout);
        
        if (chrome.runtime.lastError) {
            handleStorageError("loading layout", chrome.runtime.lastError);
            return [];
        }
        
        const layoutData = result[StorageKey.DashboardLayout];
        if (layoutData && Array.isArray(layoutData)) {
            return filterInvalidLayoutItems(layoutData);
        }
        
        return [];
    } catch (error) {
        console.error("Unexpected error loading dashboard layout:", error);
        return [];
    }
}

function isCompleteLayoutItem(item: WidgetLayout): boolean {
    return !!(
        item &&
        typeof item.id === 'string' &&
        typeof item.type === 'string' &&
        typeof item.x === 'number' &&
        typeof item.y === 'number' &&
        typeof item.w === 'number' &&
        typeof item.h === 'number'
    );
}

function validateAndFilterLayout(layout: WidgetLayout[]): WidgetLayout[] {
    if (!Array.isArray(layout)) {
        console.error("Attempted to save invalid layout:", layout);
        return [];
    }

    const validLayout = layout.filter(isCompleteLayoutItem);
    
    if (validLayout.length !== layout.length) {
        console.warn("Attempted to save layout with invalid items. Filtering invalid items.");
    }
    
    return validLayout;
}

export async function saveLayout(layout: WidgetLayout[]): Promise<void> {
    const validLayout = validateAndFilterLayout(layout);

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

async function getExistingPreferences(storageKey: string, widgetType: WidgetType): Promise<Record<string, unknown>> {
    const result = await chrome.storage.local.get(storageKey);
    
    if (chrome.runtime.lastError) {
        console.error(`Error getting existing ${widgetType} preferences before saving:`, chrome.runtime.lastError);
        return {};
    }
    
    return result[storageKey] || {};
}

async function updateStoragePreferences(
    storageKey: string,
    updatedPrefs: Record<string, unknown>,
    widgetType: WidgetType,
    widgetId: string
): Promise<void> {
    await chrome.storage.local.set({ [storageKey]: updatedPrefs });
    
    if (chrome.runtime.lastError) {
        console.error(`Error saving ${widgetType} preferences for widget ${widgetId}:`, chrome.runtime.lastError);
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

    const storageKey = getPreferencesKey(widgetType);

    try {
        const existingPrefs = await getExistingPreferences(storageKey, widgetType);
        const updatedPrefs = {
            ...existingPrefs,
            [widgetId]: prefs,
        };
        
        await updateStoragePreferences(storageKey, updatedPrefs, widgetType, widgetId);
    } catch (error) {
        console.error(`Unexpected error saving ${widgetType} preferences for widget ${widgetId}:`, error);
    }
}

function isValidPreferencesStructure(preferences: unknown, widgetId: string): boolean {
    return !!(preferences && typeof preferences === 'object' && (preferences as Record<string, unknown>)[widgetId]);
}

async function removePreferenceFromStorage(
    storageKey: string,
    existingPrefs: Record<string, unknown>,
    widgetId: string,
    widgetType: WidgetType
): Promise<void> {
    delete existingPrefs[widgetId];
    await chrome.storage.local.set({ [storageKey]: existingPrefs });
    
    if (chrome.runtime.lastError) {
        console.error(`Error setting ${widgetType} preferences after deleting key ${widgetId}:`, chrome.runtime.lastError);
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

    const storageKey = getPreferencesKey(widgetType);

    try {
        const result = await chrome.storage.local.get(storageKey);
        
        if (chrome.runtime.lastError) {
            console.error(`Error getting existing ${widgetType} preferences before deleting:`, chrome.runtime.lastError);
            return;
        }

        const existingPrefs = result[storageKey] || {};
        
        if (isValidPreferencesStructure(existingPrefs, widgetId)) {
            await removePreferenceFromStorage(storageKey, existingPrefs, widgetId, widgetType);
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
        const allPreferences = await loadAllPreferences<T>(widgetType);
        
        if (allPreferences && typeof allPreferences === 'object') {
            return allPreferences[widgetId] || null;
        }
        
        return null;
    } catch (error) {
        console.error(`Unexpected error getting preferences for widget ${widgetId}:`, error);
        return null;
    }
}
