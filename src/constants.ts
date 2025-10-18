/**
 * Central constants file for the Mosaic Board application
 * Following clean code principles: avoid magic strings and numbers
 */

// ===== Storage Keys =====
export enum StorageKey {
    DashboardLayout = 'dashboardLayout',
    BookmarkWidgetPrefs = 'bookmarkWidgetPrefs',
    WeatherWidgetPrefs = 'weatherWidgetPrefs',
    ClockWidgetPrefs = 'clockWidgetPrefs',
    WebsiteWidgetPrefs = 'websiteWidgetPrefs',
}

// ===== Grid Configuration =====
export const GRID_CONFIG = {
    COLUMNS: 12,
    MARGIN: 10,
    CELL_HEIGHT: 90,
} as const;

export const DEFAULT_WIDGET_SIZE = {
    WIDTH: 4,
    HEIGHT: 3,
} as const;

export const WEBSITE_WIDGET_SIZE = {
    WIDTH: 6,
    HEIGHT: 4,
} as const;

// ===== DOM Selectors =====
export enum DomSelector {
    GridContainer = '#grid-container',
    AddWidgetButton = 'add-widget-button',
    AddWidgetModal = 'add-widget-modal',
    WidgetSelectionList = 'widget-selection-list',
    ExportSettingsButton = 'export-settings-button',
    ImportSettingsButton = 'import-settings-button',
    ImportFileInput = 'import-file-input',
    FolderSelectorModal = 'folder-selector-modal',
    FolderTreeContainer = 'folder-tree-container',
    ConfirmFolderButton = 'confirm-folder-button',
    SelectedFolderName = 'selected-folder-name',
    ActiveWidgetSettingsMenu = 'active-widget-settings-menu',
    WidgetSettingsMenuTemplate = 'widget-settings-menu-template',
}

// ===== CSS Classes =====
export enum CssClass {
    ModalCloseButton = 'modal-close-button',
    WidgetSettingsButton = 'widget-settings-button',
    WidgetSettingsMenu = 'widget-settings-menu',
    DeleteWidgetButton = 'delete-widget-button',
    GridStackItemContent = 'grid-stack-item-content',
    Hidden = 'hidden',
    Selected = 'selected',
    FolderItem = 'folder-item',
    FolderToggle = 'folder-toggle',
    FolderIcon = 'folder-icon',
    FolderTitle = 'folder-title',
    SettingsGroup = 'settings-group',
    SettingsOption = 'settings-option',
    RadioGroup = 'radio-group',
    CheckboxGroup = 'checkbox-group',
    FolderSettingButton = 'folder-setting-button',
    CurrentFolderName = 'current-folder-name',
    BookmarkList = 'bookmark-list',
    BookmarkItem = 'bookmark-item',
    BookmarkLink = 'bookmark-link',
    ItemIcon = 'item-icon',
    ItemTitle = 'item-title',
    ItemTitleContainer = 'item-title-container',
    ItemCount = 'item-count',
    Favicon = 'favicon',
    WidgetTitle = 'widget-title',
    WidgetContent = 'widget-content',
    WidgetBackButton = 'widget-back-button',
    LoadingMessage = 'loading-message',
    EmptyFolder = 'empty-folder',
    Error = 'error',
    WeatherDisplay = 'weather-display',
    LoadingState = 'loading-state',
    ErrorState = 'error-state',
    Temperature = 'temperature',
    Unit = 'unit',
    Description = 'description',
    LocationName = 'location-name',
    WeatherIcon = 'weather-icon',
    ErrorMessage = 'error-message',
    ClockDisplay = 'clock-display',
    StopwatchControls = 'stopwatch-controls',
    StartStopwatch = 'start-stopwatch',
    StopStopwatch = 'stop-stopwatch',
    ResetStopwatch = 'reset-stopwatch',
    AlertsInfo = 'alerts-info',
    IframeContainer = 'iframe-container',
    PlaceholderMessage = 'placeholder-message',
}

// ===== File Export/Import =====
export const FILE_CONFIG = {
    EXPORT_FILENAME_PREFIX: 'mosaic_board_settings_',
    FILE_EXTENSION: '.json',
    MIME_TYPE: 'application/json',
    JSON_INDENT_SPACES: 4,
} as const;

export const DATE_FORMAT = {
    PADDING_LENGTH: 2,
    PADDING_CHAR: '0',
    MONTH_OFFSET: 1,
} as const;

// ===== Widget Configuration =====
export const WIDGET_ID_PREFIX = 'widget-';

export const WIDGET_TEMPLATE_SUFFIX = '-widget-template';

// ===== Bookmark Widget =====
export enum BookmarkFolderId {
    Root = '0',
    Default = '1',
}

export enum BookmarkViewMode {
    List = 'list',
    Grid = 'grid',
}

export const BOOKMARK_ICON_SIZE = {
    WIDTH: 16,
    HEIGHT: 16,
} as const;

export enum BookmarkFaviconSource {
    Default = 'default',
    Google = 'google',
}

// ===== Weather Widget =====
export const WEATHER_CONFIG = {
    MOCK_FETCH_DELAY_MS: 800,
    ICON_SIZE: 50,
    ICON_BASE_URL: 'https://openweathermap.org/img/wn/',
    ICON_SUFFIX: '@2x.png',
    GOOGLE_FAVICON_BASE_URL: 'https://www.google.com/s2/favicons',
    GOOGLE_FAVICON_SIZE: 32,
} as const;

export enum WeatherUnit {
    Metric = 'metric',
    Imperial = 'imperial',
}

// ===== Clock Widget =====
export const CLOCK_INTERVALS = {
    UPDATE_MS: 1000,
    STOPWATCH_UPDATE_MS: 50,
} as const;

export const TIME_FORMAT = {
    PADDING_LENGTH: 2,
    PADDING_CHAR: '0',
    MILLISECONDS_PER_SECOND: 1000,
    SECONDS_PER_MINUTE: 60,
    MILLISECONDS_TO_HUNDREDTHS: 10,
} as const;

// ===== Website Widget =====
export const WEBSITE_CONFIG = {
    REQUIRED_URL_PROTOCOLS: ['http://', 'https://'],
    IFRAME_BORDER: '0',
    SANDBOX_PERMISSIONS: 'allow-scripts allow-same-origin allow-popups allow-forms',
} as const;

export enum RefreshInterval {
    None = 0,
    FiveSeconds = 5000,
    FifteenSeconds = 15000,
    ThirtySeconds = 30000,
    OneMinute = 60000,
    TwoMinutes = 120000,
    FiveMinutes = 300000,
    TenMinutes = 600000,
}

// ===== UI Configuration =====
export const UI_SPACING = {
    MENU_OFFSET_FROM_BUTTON: 5,
    MENU_EDGE_MARGIN: 10,
} as const;

export const INPUT_CONFIG = {
    NUMBER_INPUT_WIDTH: '70px',
    NUMBER_INPUT_MIN: '0',
    NUMBER_INPUT_STEP: '1',
} as const;

// ===== Keyboard Keys =====
export enum KeyboardKey {
    Escape = 'Escape',
    Enter = 'Enter',
    Space = ' ',
}

// ===== Accessibility =====
export enum AriaRole {
    List = 'list',
    Listitem = 'listitem',
    Button = 'button',
    Group = 'group',
}

export const ARIA_HIDDEN = 'true';

// ===== HTTP & URLs =====
export enum UrlProtocol {
    Http = 'http://',
    Https = 'https://',
}

// ===== Default Values =====
export const DEFAULT_VALUES = {
    BOOKMARK_VIEW: BookmarkViewMode.List,
    BOOKMARK_SHOW_COUNT: false,
    BOOKMARK_DEFAULT_FOLDER_ID: BookmarkFolderId.Default,
    BOOKMARK_FAVICON_SOURCE: BookmarkFaviconSource.Default,
    WEATHER_LOCATION: 'Lille',
    WEATHER_UNIT: WeatherUnit.Metric,
    CLOCK_SHOW_STOPWATCH: false,
    WEBSITE_URL: '',
    WEBSITE_REFRESH_INTERVAL: 0,
    WEBSITE_OFFSET_TOP: 0,
    WEBSITE_OFFSET_LEFT: 0,
} as const;

// ===== Messages =====
export const USER_MESSAGES = {
    CONFIRM_DELETE_WIDGET: 'Are you sure you want to delete this widget?',
    IMPORT_SUCCESS: 'Settings imported successfully! Please reload the page (Ctrl+R or Cmd+R) for changes to take effect.',
    EXPORT_SUCCESS_CONSOLE: 'Settings exported successfully.',
    ERROR_EXPORTING: 'Error exporting settings. Check console for details.',
    ERROR_READING_FILE: 'Error reading file content.',
    ERROR_IMPORTING_PREFIX: 'Import Error: ',
    ERROR_INVALID_JSON: 'Invalid JSON format.',
    ERROR_UNKNOWN: 'Unknown error occurred.',
    LOADING: 'Loading...',
    EMPTY_FOLDER: 'This folder is empty.',
    ERROR_GENERIC: 'An error occurred.',
    NO_FOLDERS_FOUND: 'No bookmark folders found.',
    ERROR_LOADING_FOLDERS: 'Error loading folders.',
    PLACEHOLDER_ENTER_URL: 'Enter a website URL in settings',
    ERROR_INVALID_URL: 'Invalid URL format. Please start with http:// or https://',
    ERROR_LOADING_URL: 'Error loading {url}. Check URL/connection.',
    ALERTS_NONE: 'Alerts: None',
} as const;

// ===== Log Messages =====
export const LOG_MESSAGES = {
    MOSAIC_BOARD_INITIALIZING: 'Mosaic Board Initializing...',
    MOSAIC_BOARD_INITIALIZED: 'Mosaic Board Initialized.',
    MOSAIC_BOARD_UNLOADING: 'Mosaic Board Unloading...',
} as const;
