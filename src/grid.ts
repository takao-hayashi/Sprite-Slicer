import type { TileSettings, GridInfo, ImageMetadata } from './types';

export class GridCalculator {
  calculateGrid(settings: TileSettings, imageMetadata: ImageMetadata): GridInfo {
    const { tileWidth, tileHeight, margin, spacing, offsetX, offsetY } = settings;
    const { width, height } = imageMetadata;

    const availableWidth = width - margin * 2 - offsetX;
    const availableHeight = height - margin * 2 - offsetY;

    const cols = Math.floor((availableWidth + spacing) / (tileWidth + spacing));
    const rows = Math.floor((availableHeight + spacing) / (tileHeight + spacing));

    return {
      rows: Math.max(0, rows),
      cols: Math.max(0, cols),
      totalTiles: Math.max(0, rows * cols)
    };
  }

  validateSettings(settings: TileSettings, imageMetadata: ImageMetadata): string[] {
    const errors: string[] = [];
    const { tileWidth, tileHeight, margin, spacing, offsetX, offsetY } = settings;
    const { width, height } = imageMetadata;

    if (tileWidth <= 0) errors.push('Tile width must be greater than 0');
    if (tileHeight <= 0) errors.push('Tile height must be greater than 0');
    if (margin < 0) errors.push('Margin cannot be negative');
    if (spacing < 0) errors.push('Spacing cannot be negative');
    if (offsetX < 0) errors.push('Offset X cannot be negative');
    if (offsetY < 0) errors.push('Offset Y cannot be negative');

    const minRequiredWidth = margin * 2 + offsetX + tileWidth;
    const minRequiredHeight = margin * 2 + offsetY + tileHeight;

    if (width < minRequiredWidth) {
      errors.push(`Image width (${width}px) is too small for current settings (requires at least ${minRequiredWidth}px)`);
    }
    if (height < minRequiredHeight) {
      errors.push(`Image height (${height}px) is too small for current settings (requires at least ${minRequiredHeight}px)`);
    }

    return errors;
  }

  autoDetectTileSize(image: HTMLImageElement): Partial<TileSettings> | null {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = image.width;
    canvas.height = image.height;
    ctx.drawImage(image, 0, 0);

    const imageData = ctx.getImageData(0, 0, image.width, image.height);
    
    // Try to detect common tile sizes
    const commonSizes = [16, 24, 32, 48, 64, 96, 128];
    
    for (const size of commonSizes) {
      const detected = this.tryDetectGrid(imageData, size, size);
      if (detected) {
        return detected;
      }
    }

    return null;
  }

  private tryDetectGrid(imageData: ImageData, tileWidth: number, tileHeight: number): Partial<TileSettings> | null {
    const { width, height, data } = imageData;
    
    // Simple heuristic: check if we can find a regular pattern
    const cols = Math.floor(width / tileWidth);
    const rows = Math.floor(height / tileHeight);
    
    if (cols < 2 || rows < 2) return null;
    
    // Check if the grid lines are consistent (simplified detection)
    let consistentVertical = 0;
    let consistentHorizontal = 0;
    
    // Check vertical lines
    for (let col = 1; col < cols; col++) {
      const x = col * tileWidth;
      if (x < width) {
        let isConsistent = true;
        for (let y = 0; y < height; y += 10) {
          const idx = (y * width + x) * 4 + 3; // alpha channel
          if (data[idx] > 128) { // not transparent enough
            isConsistent = false;
            break;
          }
        }
        if (isConsistent) consistentVertical++;
      }
    }
    
    // Check horizontal lines
    for (let row = 1; row < rows; row++) {
      const y = row * tileHeight;
      if (y < height) {
        let isConsistent = true;
        for (let x = 0; x < width; x += 10) {
          const idx = (y * width + x) * 4 + 3; // alpha channel
          if (data[idx] > 128) { // not transparent enough
            isConsistent = false;
            break;
          }
        }
        if (isConsistent) consistentHorizontal++;
      }
    }
    
    // If we found consistent grid lines, this might be the right size
    if (consistentVertical >= cols * 0.7 && consistentHorizontal >= rows * 0.7) {
      return {
        tileWidth,
        tileHeight,
        margin: 0,
        spacing: 0,
        offsetX: 0,
        offsetY: 0
      };
    }
    
    return null;
  }
}

export class GridOverlay {
  private canvas: HTMLCanvasElement;
  public ctx: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
  }

  drawGrid(settings: TileSettings, gridInfo: GridInfo, scale: number = 1) {
    this.ctx.save();
    this.ctx.scale(scale, scale);
    
    const { tileWidth, tileHeight, margin, spacing, offsetX, offsetY } = settings;
    const { rows, cols } = gridInfo;

    this.ctx.strokeStyle = '#ff0000';
    this.ctx.lineWidth = 1 / scale;
    this.ctx.setLineDash([5 / scale, 5 / scale]);

    // Draw grid lines
    for (let row = 0; row <= rows; row++) {
      const y = margin + offsetY + row * (tileHeight + spacing);
      this.ctx.beginPath();
      this.ctx.moveTo(margin + offsetX, y);
      this.ctx.lineTo(margin + offsetX + cols * (tileWidth + spacing) - spacing, y);
      this.ctx.stroke();
    }

    for (let col = 0; col <= cols; col++) {
      const x = margin + offsetX + col * (tileWidth + spacing);
      this.ctx.beginPath();
      this.ctx.moveTo(x, margin + offsetY);
      this.ctx.lineTo(x, margin + offsetY + rows * (tileHeight + spacing) - spacing);
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}

