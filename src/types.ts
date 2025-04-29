/**
 * Represents the layout information for a single widget in Gridstack.
 */
export interface WidgetLayout {
    id: string; // Unique identifier for the widget instance
    x: number;
    y: number;
    w: number; // width in grid units
    h: number; // height in grid units
    type: WidgetType; // Type of the widget ('bookmarks', 'weather', etc.)
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
    WebsiteEmbed = 'website-embed' // Standardized name
}

/**
 * Base interface for widget preferences. Each widget type will extend this.
 */
export interface BaseWidgetPreferences {
    // Common preferences can go here if any
}

/**
 * Preferences specific to the Bookmarks widget.
 */
export interface BookmarkWidgetPreferences extends BaseWidgetPreferences {
    view: 'list' | 'grid';
    showCount: boolean;
    defaultFolderId: string | null; // ID of the default folder to display
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
 * Preferences specific to the Website Embed widget.
 * Standardized name
 */
export interface WebsiteEmbedWidgetPreferences extends BaseWidgetPreferences {
    url: string; // URL to embed
    refreshInterval: number; // Interval in milliseconds (0 for no refresh)
    offsetTop: number; // Offset from top in pixels
    offsetLeft: number; // Offset from left in pixels
}


/**
 * Union type for all possible widget preferences.
 */
export type WidgetPreferences =
    | BookmarkWidgetPreferences
    | WeatherWidgetPreferences
    | ClockWidgetPreferences
    | WebsiteEmbedWidgetPreferences; // Standardized name

/**
 * Structure for storing widget preferences in chrome.storage.
 * Uses a Record where the key is the widget instance ID.
 */
export type StoredPreferences<T extends BaseWidgetPreferences> = Record<string, T>;

/**
 * Represents a bookmark node from the chrome.bookmarks API.
 */
export type BookmarkTreeNode = chrome.bookmarks.BookmarkTreeNode;

