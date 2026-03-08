export interface MosaicTile {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  type: 'widget' | 'link' | 'image';
  content?: string;
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
