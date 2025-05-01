/**
 * Represents the layout information for a single widget in Gridstack.
 */
export interface WidgetLayout {
    id: string;
    x: number;
    y: number;
    w: number;
    h: number;
    type: WidgetType;
}

/**
 * Represents the overall dashboard layout stored in chrome.storage.
 */
export type DashboardLayout = WidgetLayout[];

/**
 * Enum defining the possible types of widgets.
 */
export enum WidgetType {
    Bookmarks = 'bookmarks',
    Weather = 'weather',
    Clock = 'clock',
    Website = 'website' // Renamed from WebsiteEmbed
}

/**
 * Base interface for widget preferences.
 */
export interface BaseWidgetPreferences {
}

/**
 * Preferences specific to the Bookmarks widget.
 */
export interface BookmarkWidgetPreferences extends BaseWidgetPreferences {
    view: 'list' | 'grid';
    showCount: boolean;
    defaultFolderId: string | null;
}

/**
 * Preferences specific to the Weather widget.
 */
export interface WeatherWidgetPreferences extends BaseWidgetPreferences {
    location: string;
    unit: 'metric' | 'imperial';
}

/**
 * Preferences specific to the Clock widget.
 */
export interface ClockWidgetPreferences extends BaseWidgetPreferences {
    showStopwatch: boolean;
}

/**
 * Preferences specific to the Website widget.
 * Renamed from WebsiteEmbedWidgetPreferences
 */
export interface WebsiteWidgetPreferences extends BaseWidgetPreferences {
    url: string;
    refreshInterval: number;
    offsetTop: number;
    offsetLeft: number;
}


/**
 * Union type for all possible widget preferences.
 */
export type WidgetPreferences =
    | BookmarkWidgetPreferences
    | WeatherWidgetPreferences
    | ClockWidgetPreferences
    | WebsiteWidgetPreferences; // Renamed

/**
 * Structure for storing widget preferences in chrome.storage.
 */
export type StoredPreferences<T extends BaseWidgetPreferences> = Record<string, T>;

/**
 * Represents a bookmark node from the chrome.bookmarks API.
 */
export type BookmarkTreeNode = chrome.bookmarks.BookmarkTreeNode;

