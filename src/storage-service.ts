import {
    StoredPreferences,
    BaseWidgetPreferences,
    WidgetType,
    WidgetLayout
} from './types';

const LAYOUT_KEY = 'dashboardLayout';
const BOOKMARK_PREFS_KEY = 'bookmarkWidgetPrefs';
const WEATHER_PREFS_KEY = 'weatherWidgetPrefs';
const CLOCK_PREFS_KEY = 'clockWidgetPrefs';

/**
 * Gets the storage key based on widget type.
 * @param widgetType The type of the widget.
 * @returns The corresponding storage key.
 */
function getPreferencesKey(widgetType: WidgetType): string {
    switch (widgetType) {
        case WidgetType.Bookmarks: return BOOKMARK_PREFS_KEY;
        case WidgetType.Weather: return WEATHER_PREFS_KEY;
        case WidgetType.Clock: return CLOCK_PREFS_KEY;
        default:
             const _exhaustiveCheck: never = widgetType;
             console.error(`Unknown widget type for preferences: ${_exhaustiveCheck}`);
             throw new Error(`Unknown widget type for preferences: ${widgetType}`);
    }
}

/**
 * Loads the dashboard layout from storage.
 * Returns an empty array if no layout is found or on error.
 */
export async function loadLayout(): Promise<WidgetLayout[]> {
    try {
        const result = await chrome.storage.local.get(LAYOUT_KEY);
        if (chrome.runtime.lastError) {
            console.error("Error loading layout from storage:", chrome.runtime.lastError);
            return [];
        }
        if (result[LAYOUT_KEY] && Array.isArray(result[LAYOUT_KEY])) {
             const validLayout = result[LAYOUT_KEY].filter(item =>
                 item && typeof item.id !== 'undefined' && typeof item.type !== 'undefined'
             );
             if (validLayout.length !== result[LAYOUT_KEY].length) {
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

/**
 * Saves the dashboard layout to storage.
 */
export async function saveLayout(layout: WidgetLayout[]): Promise<void> {
    if (!Array.isArray(layout)) {
        console.error("Attempted to save invalid layout:", layout);
        return;
    }
    const validLayout = layout.filter(item =>
         item && typeof item.id === 'string' && typeof item.type === 'string' &&
         typeof item.x === 'number' && typeof item.y === 'number' &&
         typeof item.w === 'number' && typeof item.h === 'number'
    );
     if (validLayout.length !== layout.length) {
         console.warn("Attempted to save layout with invalid items. Filtering invalid items.");
     }

    try {
        await chrome.storage.local.set({ [LAYOUT_KEY]: validLayout });
        if (chrome.runtime.lastError) {
            console.error("Error saving layout to storage:", chrome.runtime.lastError);
            // Handle potential quota exceeded errors, etc.
        }
    } catch (error) {
        console.error("Unexpected error saving dashboard layout:", error);
    }
}

/**
 * Loads all preferences for a specific widget type from storage.
 * Returns an empty object if no preferences are found or on error.
 */
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

/**
 * Saves the preferences for a specific widget instance.
 * It merges the new preferences with existing ones for that type.
 */
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
        // Use a transaction-like pattern: get, modify, set
        const result = await chrome.storage.local.get(key);
         if (chrome.runtime.lastError) {
             console.error(`Error getting existing ${widgetType} preferences before saving:`, chrome.runtime.lastError);
             // Decide how to proceed: overwrite or abort? Aborting might be safer.
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

/**
 * Deletes the preferences for a specific widget instance.
 */
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
             return; // Abort deletion if cannot read existing data
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


/**
 * Gets the preferences for a single widget instance.
 * Returns null if not found or on error.
 */
export async function getWidgetPreferences<T extends BaseWidgetPreferences>(
    widgetId: string,
    widgetType: WidgetType
): Promise<T | null> {
     if (!widgetId) {
        console.error("Invalid widgetId for getWidgetPreferences");
        return null;
    }
     try {
        const allPrefs = await loadAllPreferences<T>(widgetType); // This already handles storage errors
        if (allPrefs && typeof allPrefs === 'object') {
             return allPrefs[widgetId] || null;
        }
        return null;
    } catch (error) {
        // Catch unexpected errors during preference access, though loadAllPreferences should handle storage errors.
        console.error(`Unexpected error getting preferences for widget ${widgetId}:`, error);
        return null;
    }
}
