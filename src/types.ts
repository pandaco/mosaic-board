export interface WidgetLayout {
    id: string;
    x: number;
    y: number;
    w: number;
    h: number;
    type: WidgetType;
}

export type DashboardLayout = WidgetLayout[];

export enum WidgetType {
    Bookmarks = 'bookmarks',
    Weather = 'weather',
    Clock = 'clock',
    Website = 'website'
}

export interface BaseWidgetPreferences {
}

export interface BookmarkWidgetPreferences extends BaseWidgetPreferences {
    view: 'list' | 'grid';
    showCount: boolean;
    defaultFolderId: string | null;
    faviconSource: 'default' | 'google';
}

export interface WeatherWidgetPreferences extends BaseWidgetPreferences {
    location: string;
    unit: 'metric' | 'imperial';
}

export interface ClockWidgetPreferences extends BaseWidgetPreferences {
    showStopwatch: boolean;
}

export interface WebsiteWidgetPreferences extends BaseWidgetPreferences {
    url: string;
    refreshInterval: number;
    offsetTop: number;
    offsetLeft: number;
}

export type WidgetPreferences =
    | BookmarkWidgetPreferences
    | WeatherWidgetPreferences
    | ClockWidgetPreferences
    | WebsiteWidgetPreferences;

export type StoredPreferences<T extends BaseWidgetPreferences> = Record<string, T>;

export type BookmarkTreeNode = chrome.bookmarks.BookmarkTreeNode;
