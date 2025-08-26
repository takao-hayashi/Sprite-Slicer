export interface TileSettings {
  tileWidth: number;
  tileHeight: number;
  margin: number;
  spacing: number;
  offsetX: number;
  offsetY: number;
  trimTransparent: boolean;
  preservePadding: number;
}

export interface ImageMetadata {
  width: number;
  height: number;
  hasAlpha: boolean;
}

export interface GridInfo {
  rows: number;
  cols: number;
  totalTiles: number;
}

export interface ExportSettings {
  namingPattern: 'row_col' | 'index' | 'custom';
  customPrefix: string;
  skipTransparent: boolean;
  includeContactSheet: boolean;
}

export interface TileData {
  canvas: HTMLCanvasElement;
  row: number;
  col: number;
  index: number;
  isEmpty: boolean;
}

export interface ExportProgress {
  current: number;
  total: number;
  percentage: number;
  eta?: number;
}

