import type { TileSettings, TileData, GridInfo, ExportProgress } from './types';

export class SpriteSlicer {
  constructor() {
    // No instance variables needed
  }

  async sliceSprite(
    image: HTMLImageElement,
    settings: TileSettings,
    gridInfo: GridInfo,
    onProgress?: (progress: ExportProgress) => void
  ): Promise<TileData[]> {
    const tiles: TileData[] = [];
    const { rows, cols } = gridInfo;
    const total = rows * cols;
    let current = 0;
    const startTime = Date.now();

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const tile = this.extractTile(image, settings, row, col);
        tiles.push(tile);
        current++;

        if (onProgress) {
          const elapsed = Date.now() - startTime;
          const eta = elapsed > 0 ? (elapsed / current) * (total - current) : 0;
          
          onProgress({
            current,
            total,
            percentage: (current / total) * 100,
            eta
          });
        }

        // Yield control to prevent blocking
        if (current % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }
    }

    return tiles;
  }

  private extractTile(
    image: HTMLImageElement,
    settings: TileSettings,
    row: number,
    col: number
  ): TileData {
    const { tileWidth, tileHeight, margin, spacing, offsetX, offsetY, trimTransparent, preservePadding } = settings;
    
    const sourceX = margin + offsetX + col * (tileWidth + spacing);
    const sourceY = margin + offsetY + row * (tileHeight + spacing);

    // Create canvas for this tile
    const tileCanvas = document.createElement('canvas');
    const tileCtx = tileCanvas.getContext('2d')!;
    
    tileCanvas.width = tileWidth;
    tileCanvas.height = tileHeight;
    
    // Draw the tile
    tileCtx.drawImage(
      image,
      sourceX, sourceY, tileWidth, tileHeight,
      0, 0, tileWidth, tileHeight
    );

    let finalCanvas = tileCanvas;
    let isEmpty = false;

    if (trimTransparent) {
      const trimResult = this.trimTransparentEdges(tileCanvas, preservePadding);
      finalCanvas = trimResult.canvas;
      isEmpty = trimResult.isEmpty;
    } else {
      isEmpty = this.isCanvasEmpty(tileCanvas);
    }

    return {
      canvas: finalCanvas,
      row,
      col,
      index: row * (settings.tileWidth > 0 ? Math.floor((image.width - settings.margin * 2 - settings.offsetX + settings.spacing) / (settings.tileWidth + settings.spacing)) : 1) + col,
      isEmpty
    };
  }

  private trimTransparentEdges(canvas: HTMLCanvasElement, padding: number): { canvas: HTMLCanvasElement; isEmpty: boolean } {
    const ctx = canvas.getContext('2d')!;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    let minX = canvas.width;
    let minY = canvas.height;
    let maxX = -1;
    let maxY = -1;

    // Find bounding box of non-transparent pixels
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const alpha = data[(y * canvas.width + x) * 4 + 3];
        if (alpha > 0) {
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
    }

    // If no non-transparent pixels found
    if (maxX === -1) {
      const emptyCanvas = document.createElement('canvas');
      emptyCanvas.width = 1;
      emptyCanvas.height = 1;
      return { canvas: emptyCanvas, isEmpty: true };
    }

    // Add padding
    minX = Math.max(0, minX - padding);
    minY = Math.max(0, minY - padding);
    maxX = Math.min(canvas.width - 1, maxX + padding);
    maxY = Math.min(canvas.height - 1, maxY + padding);

    const trimmedWidth = maxX - minX + 1;
    const trimmedHeight = maxY - minY + 1;

    const trimmedCanvas = document.createElement('canvas');
    const trimmedCtx = trimmedCanvas.getContext('2d')!;
    trimmedCanvas.width = trimmedWidth;
    trimmedCanvas.height = trimmedHeight;

    trimmedCtx.drawImage(
      canvas,
      minX, minY, trimmedWidth, trimmedHeight,
      0, 0, trimmedWidth, trimmedHeight
    );

    return { canvas: trimmedCanvas, isEmpty: false };
  }

  private isCanvasEmpty(canvas: HTMLCanvasElement): boolean {
    const ctx = canvas.getContext('2d')!;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    for (let i = 3; i < data.length; i += 4) {
      if (data[i] > 0) {
        return false;
      }
    }
    return true;
  }

  createContactSheet(tiles: TileData[], columns: number = 10, backgroundColor: string = '#ffffff'): HTMLCanvasElement {
    const validTiles = tiles.filter(tile => !tile.isEmpty);
    if (validTiles.length === 0) {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      return canvas;
    }

    const maxTileWidth = Math.max(...validTiles.map(tile => tile.canvas.width));
    const maxTileHeight = Math.max(...validTiles.map(tile => tile.canvas.height));
    
    const rows = Math.ceil(validTiles.length / columns);
    const canvasWidth = columns * maxTileWidth;
    const canvasHeight = rows * maxTileHeight;

    const contactSheet = document.createElement('canvas');
    const ctx = contactSheet.getContext('2d')!;
    contactSheet.width = canvasWidth;
    contactSheet.height = canvasHeight;

    // Fill background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Draw tiles
    validTiles.forEach((tile, index) => {
      const col = index % columns;
      const row = Math.floor(index / columns);
      const x = col * maxTileWidth;
      const y = row * maxTileHeight;

      ctx.drawImage(tile.canvas, x, y);
      
      // Draw tile index
      ctx.fillStyle = '#000000';
      ctx.font = '12px Arial';
      ctx.fillText(`${tile.index}`, x + 2, y + 14);
    });

    return contactSheet;
  }
}

