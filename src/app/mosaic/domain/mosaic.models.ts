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
}

export interface MosaicLayout {
  tiles: MosaicTile[];
}
