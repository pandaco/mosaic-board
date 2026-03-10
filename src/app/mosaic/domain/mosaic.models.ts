interface WidgetBase {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
}

export interface ContentWidget extends WidgetBase {
  type: 'widget' | 'link' | 'image';
  content?: string;
}

export interface BookmarkWidget extends WidgetBase {
  type: 'bookmark';
  configuration: BookmarkWidgetConfig;
}

export type MosaicWidget = ContentWidget | BookmarkWidget;

export interface BookmarkWidgetConfig {
  rootFolderId?: string;
  displayMode: 'grid' | 'list';
  useGoogleFavicons: boolean;
  showItemCount: boolean;
}

export interface BookmarkItem {
  id: string;
  title: string;
  url?: string;
  type: 'folder' | 'link';
  icon?: string;
  childrenCount?: number;
}

export interface TilePosition {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface MosaicGridOptions {
  columns: number;
  cellHeight: string;
  margin: number;
  animate: boolean;
  placeholder?: {
    enabled: boolean;
    className?: string;
  };
}

export interface MosaicLayout {
  widgets: MosaicWidget[];
}
