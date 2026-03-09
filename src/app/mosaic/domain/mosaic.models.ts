export interface MosaicTile {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  type: 'widget' | 'link' | 'image' | 'bookmark';
  content?: string;
  configuration?: BookmarkWidgetConfig;
}

export interface BookmarkWidgetConfig {
  rootFolderId?: string;
  displayMode: 'grid' | 'list';
}

export interface BookmarkItem {
  id: string;
  title: string;
  url?: string;
  type: 'folder' | 'link';
  icon?: string;
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
  tiles: MosaicTile[];
}
