import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import type { TileData, ExportSettings, TileSettings, ImageMetadata, ExportProgress } from './types';

export class ZipExporter {
  async exportTiles(
    tiles: TileData[],
    settings: TileSettings,
    exportSettings: ExportSettings,
    imageMetadata: ImageMetadata,
    contactSheet?: HTMLCanvasElement,
    onProgress?: (progress: ExportProgress) => void
  ): Promise<void> {
    const zip = new JSZip();
    const tilesFolder = zip.folder('tiles')!;
    
    const validTiles = exportSettings.skipTransparent 
      ? tiles.filter(tile => !tile.isEmpty)
      : tiles;

    const total = validTiles.length + (contactSheet ? 1 : 0) + 1; // +1 for meta.json
    let current = 0;
    const startTime = Date.now();

    // Add tiles
    for (const tile of validTiles) {
      const filename = this.generateFilename(tile, exportSettings);
      const blob = await this.canvasToBlob(tile.canvas);
      tilesFolder.file(filename, blob);
      
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

      // Yield control periodically
      if (current % 5 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }

    // Add contact sheet if enabled
    if (contactSheet && exportSettings.includeContactSheet) {
      const contactBlob = await this.canvasToBlob(contactSheet);
      zip.file('contact-sheet.png', contactBlob);
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
    }

    // Add metadata
    const metadata = {
      settings: {
        tileWidth: settings.tileWidth,
        tileHeight: settings.tileHeight,
        margin: settings.margin,
        spacing: settings.spacing,
        offsetX: settings.offsetX,
        offsetY: settings.offsetY,
        trimTransparent: settings.trimTransparent,
        preservePadding: settings.preservePadding
      },
      export: {
        namingPattern: exportSettings.namingPattern,
        customPrefix: exportSettings.customPrefix,
        skipTransparent: exportSettings.skipTransparent,
        includeContactSheet: exportSettings.includeContactSheet
      },
      source: {
        width: imageMetadata.width,
        height: imageMetadata.height,
        hasAlpha: imageMetadata.hasAlpha
      },
      result: {
        totalTiles: tiles.length,
        exportedTiles: validTiles.length,
        skippedTiles: tiles.length - validTiles.length
      },
      timestamp: new Date().toISOString()
    };

    zip.file('meta.json', JSON.stringify(metadata, null, 2));
    current++;

    if (onProgress) {
      onProgress({
        current,
        total,
        percentage: 100,
        eta: 0
      });
    }

    // Generate and download ZIP
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    saveAs(zipBlob, 'sprites_out.zip');
  }

  private generateFilename(tile: TileData, settings: ExportSettings): string {
    const { namingPattern, customPrefix } = settings;
    
    switch (namingPattern) {
      case 'row_col':
        return `${tile.row}_${tile.col}.png`;
      case 'index':
        return `${tile.index}.png`;
      case 'custom':
        return `${customPrefix}${tile.row}_${tile.col}.png`;
      default:
        return `${tile.row}_${tile.col}.png`;
    }
  }

  private canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to convert canvas to blob'));
        }
      }, 'image/png');
    });
  }
}

