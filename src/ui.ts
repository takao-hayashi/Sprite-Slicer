import type { TileSettings, ExportSettings, ImageMetadata, GridInfo, ExportProgress } from './types';
import { ImageLoader } from './imageLoader';
import { GridCalculator, GridOverlay } from './grid';
import { SpriteSlicer } from './slicer';
import { ZipExporter } from './zipper';

export class UI {
  private imageLoader: ImageLoader;
  private gridCalculator: GridCalculator;
  private gridOverlay: GridOverlay | null = null;
  private slicer: SpriteSlicer;
  private zipExporter: ZipExporter;

  private currentImage: HTMLImageElement | null = null;
  private currentImageMetadata: ImageMetadata | null = null;
  private currentSettings: TileSettings;
  private currentExportSettings: ExportSettings;

  private previewCanvas: HTMLCanvasElement;
  private previewCtx: CanvasRenderingContext2D;
  private overlayCanvas: HTMLCanvasElement;
  
  private scale: number = 1;
  private panX: number = 0;
  private panY: number = 0;
  private isPanning: boolean = false;
  private lastPanX: number = 0;
  private lastPanY: number = 0;

  constructor() {
    this.imageLoader = new ImageLoader();
    this.gridCalculator = new GridCalculator();
    this.slicer = new SpriteSlicer();
    this.zipExporter = new ZipExporter();

    this.previewCanvas = document.getElementById('preview-canvas') as HTMLCanvasElement;
    this.previewCtx = this.previewCanvas.getContext('2d')!;
    this.overlayCanvas = document.getElementById('overlay-canvas') as HTMLCanvasElement;
    this.gridOverlay = new GridOverlay(this.overlayCanvas);

    this.currentSettings = {
      tileWidth: 32,
      tileHeight: 32,
      margin: 0,
      spacing: 0,
      offsetX: 0,
      offsetY: 0,
      trimTransparent: false,
      preservePadding: 0
    };

    this.currentExportSettings = {
      namingPattern: 'row_col',
      customPrefix: '',
      skipTransparent: false,
      includeContactSheet: false
    };

    this.setupEventListeners();
    this.loadSettings();
  }

  private setupEventListeners() {
    // File input
    const fileInput = document.getElementById('file-input') as HTMLInputElement;
    const dropZone = document.getElementById('drop-zone') as HTMLElement;

    fileInput.addEventListener('change', (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) this.handleFile(file);
    });

    // Drag and drop
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('drag-over');
      const file = e.dataTransfer?.files[0];
      if (file) this.handleFile(file);
    });

    // Settings inputs
    this.setupSettingsListeners();

    // Export settings
    this.setupExportListeners();

    // Canvas interactions
    this.setupCanvasListeners();

    // Auto-detect button
    const autoDetectBtn = document.getElementById('auto-detect-btn') as HTMLButtonElement;
    autoDetectBtn.addEventListener('click', () => this.autoDetectTileSize());

    // Export button
    const exportBtn = document.getElementById('export-btn') as HTMLButtonElement;
    exportBtn.addEventListener('click', () => this.exportTiles());

    // Grid toggle
    const gridToggle = document.getElementById('grid-toggle') as HTMLInputElement;
    gridToggle.addEventListener('change', () => this.updatePreview());
  }

  private setupSettingsListeners() {
    const inputs = [
      'tile-width', 'tile-height', 'margin', 'spacing', 
      'offset-x', 'offset-y', 'preserve-padding'
    ];

    inputs.forEach(id => {
      const input = document.getElementById(id) as HTMLInputElement;
      input.addEventListener('input', () => {
        this.updateSettingsFromInputs();
        this.updatePreview();
        this.saveSettings();
      });
    });

    const trimToggle = document.getElementById('trim-transparent') as HTMLInputElement;
    trimToggle.addEventListener('change', () => {
      this.updateSettingsFromInputs();
      this.updatePreview();
      this.saveSettings();
    });
  }

  private setupExportListeners() {
    const namingSelect = document.getElementById('naming-pattern') as HTMLSelectElement;
    const customPrefix = document.getElementById('custom-prefix') as HTMLInputElement;
    const skipTransparent = document.getElementById('skip-transparent') as HTMLInputElement;
    const includeContactSheet = document.getElementById('include-contact-sheet') as HTMLInputElement;

    [namingSelect, customPrefix, skipTransparent, includeContactSheet].forEach(element => {
      element.addEventListener('change', () => {
        this.updateExportSettingsFromInputs();
        this.saveSettings();
      });
    });
  }

  private setupCanvasListeners() {
    // Zoom with mouse wheel
    this.previewCanvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      this.scale = Math.max(0.1, Math.min(5, this.scale * delta));
      this.updatePreview();
    });

    // Pan with mouse drag
    this.previewCanvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) { // Left mouse button
        this.isPanning = true;
        this.lastPanX = e.clientX;
        this.lastPanY = e.clientY;
        this.previewCanvas.style.cursor = 'grabbing';
      }
    });

    this.previewCanvas.addEventListener('mousemove', (e) => {
      if (this.isPanning) {
        const deltaX = e.clientX - this.lastPanX;
        const deltaY = e.clientY - this.lastPanY;
        this.panX += deltaX;
        this.panY += deltaY;
        this.lastPanX = e.clientX;
        this.lastPanY = e.clientY;
        this.updatePreview();
      }
    });

    this.previewCanvas.addEventListener('mouseup', () => {
      this.isPanning = false;
      this.previewCanvas.style.cursor = 'grab';
    });

    this.previewCanvas.addEventListener('mouseleave', () => {
      this.isPanning = false;
      this.previewCanvas.style.cursor = 'grab';
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.target === document.body) {
        switch (e.key) {
          case '+':
          case '=':
            e.preventDefault();
            this.scale = Math.min(5, this.scale * 1.1);
            this.updatePreview();
            break;
          case '-':
            e.preventDefault();
            this.scale = Math.max(0.1, this.scale * 0.9);
            this.updatePreview();
            break;
        }
      }
    });
  }

  private async handleFile(file: File) {
    try {
      this.showStatus('Loading image...', 'info');
      const image = await this.imageLoader.loadImage(file);
      this.currentImage = image;
      this.currentImageMetadata = this.imageLoader.getImageMetadata(image);
      
      this.updateImageInfo();
      this.fitImageToCanvas();
      this.updatePreview();
      this.showStatus('Image loaded successfully', 'success');
      
      // Enable controls
      this.enableControls(true);
      
    } catch (error) {
      this.showStatus(`Error: ${(error as Error).message}`, 'error');
    }
  }

  private updateImageInfo() {
    if (!this.currentImageMetadata) return;
    
    const info = document.getElementById('image-info') as HTMLElement;
    info.innerHTML = `
      <strong>Dimensions:</strong> ${this.currentImageMetadata.width} × ${this.currentImageMetadata.height}px<br>
      <strong>Alpha Channel:</strong> ${this.currentImageMetadata.hasAlpha ? 'Yes' : 'No'}
    `;
  }

  private fitImageToCanvas() {
    if (!this.currentImage) return;
    
    const containerWidth = this.previewCanvas.parentElement!.clientWidth;
    const containerHeight = this.previewCanvas.parentElement!.clientHeight;
    
    this.scale = Math.min(
      containerWidth / this.currentImage.width,
      containerHeight / this.currentImage.height,
      1
    );
    
    this.panX = 0;
    this.panY = 0;
    
    this.previewCanvas.width = containerWidth;
    this.previewCanvas.height = containerHeight;
    this.overlayCanvas.width = containerWidth;
    this.overlayCanvas.height = containerHeight;
  }

  private updatePreview() {
    if (!this.currentImage || !this.currentImageMetadata) return;
    
    // Clear canvases
    this.previewCtx.clearRect(0, 0, this.previewCanvas.width, this.previewCanvas.height);
    this.gridOverlay!.clear();
    
    // Calculate image position
    const imageWidth = this.currentImage.width * this.scale;
    const imageHeight = this.currentImage.height * this.scale;
    const x = (this.previewCanvas.width - imageWidth) / 2 + this.panX;
    const y = (this.previewCanvas.height - imageHeight) / 2 + this.panY;
    
    // Draw image
    this.previewCtx.drawImage(this.currentImage, x, y, imageWidth, imageHeight);
    
    // Draw grid if enabled
    const gridToggle = document.getElementById('grid-toggle') as HTMLInputElement;
    if (gridToggle.checked) {
      const gridInfo = this.gridCalculator.calculateGrid(this.currentSettings, this.currentImageMetadata);
      
      this.gridOverlay!.ctx.save();
      this.gridOverlay!.ctx.translate(x, y);
      this.gridOverlay!.drawGrid(this.currentSettings, gridInfo, this.scale);
      this.gridOverlay!.ctx.restore();
      
      // Update grid info display
      this.updateGridInfo(gridInfo);
    }
    
    // Validate settings and show errors
    this.validateAndShowErrors();
  }

  private updateGridInfo(gridInfo: GridInfo) {
    const gridInfoElement = document.getElementById('grid-info') as HTMLElement;
    gridInfoElement.textContent = `${gridInfo.rows} × ${gridInfo.cols} = ${gridInfo.totalTiles} tiles`;
  }

  private validateAndShowErrors() {
    if (!this.currentImageMetadata) return;
    
    const errors = this.gridCalculator.validateSettings(this.currentSettings, this.currentImageMetadata);
    const errorContainer = document.getElementById('validation-errors') as HTMLElement;
    
    if (errors.length > 0) {
      errorContainer.innerHTML = errors.map(error => `<div class="error">${error}</div>`).join('');
      errorContainer.style.display = 'block';
    } else {
      errorContainer.style.display = 'none';
    }
  }

  private updateSettingsFromInputs() {
    this.currentSettings = {
      tileWidth: parseInt((document.getElementById('tile-width') as HTMLInputElement).value) || 32,
      tileHeight: parseInt((document.getElementById('tile-height') as HTMLInputElement).value) || 32,
      margin: parseInt((document.getElementById('margin') as HTMLInputElement).value) || 0,
      spacing: parseInt((document.getElementById('spacing') as HTMLInputElement).value) || 0,
      offsetX: parseInt((document.getElementById('offset-x') as HTMLInputElement).value) || 0,
      offsetY: parseInt((document.getElementById('offset-y') as HTMLInputElement).value) || 0,
      trimTransparent: (document.getElementById('trim-transparent') as HTMLInputElement).checked,
      preservePadding: parseInt((document.getElementById('preserve-padding') as HTMLInputElement).value) || 0
    };
  }

  private updateExportSettingsFromInputs() {
    this.currentExportSettings = {
      namingPattern: (document.getElementById('naming-pattern') as HTMLSelectElement).value as any,
      customPrefix: (document.getElementById('custom-prefix') as HTMLInputElement).value,
      skipTransparent: (document.getElementById('skip-transparent') as HTMLInputElement).checked,
      includeContactSheet: (document.getElementById('include-contact-sheet') as HTMLInputElement).checked
    };
  }

  private autoDetectTileSize() {
    if (!this.currentImage) {
      this.showStatus('Please load an image first', 'error');
      return;
    }
    
    this.showStatus('Detecting tile size...', 'info');
    
    const detected = this.gridCalculator.autoDetectTileSize(this.currentImage);
    
    if (detected) {
      // Update inputs with detected values
      if (detected.tileWidth) (document.getElementById('tile-width') as HTMLInputElement).value = detected.tileWidth.toString();
      if (detected.tileHeight) (document.getElementById('tile-height') as HTMLInputElement).value = detected.tileHeight.toString();
      if (detected.margin !== undefined) (document.getElementById('margin') as HTMLInputElement).value = detected.margin.toString();
      if (detected.spacing !== undefined) (document.getElementById('spacing') as HTMLInputElement).value = detected.spacing.toString();
      if (detected.offsetX !== undefined) (document.getElementById('offset-x') as HTMLInputElement).value = detected.offsetX.toString();
      if (detected.offsetY !== undefined) (document.getElementById('offset-y') as HTMLInputElement).value = detected.offsetY.toString();
      
      this.updateSettingsFromInputs();
      this.updatePreview();
      this.saveSettings();
      
      this.showStatus(`Auto-detected: ${detected.tileWidth}×${detected.tileHeight} tiles`, 'success');
    } else {
      this.showStatus('Could not auto-detect tile size. Please set manually.', 'warning');
    }
  }

  private async exportTiles() {
    if (!this.currentImage || !this.currentImageMetadata) {
      this.showStatus('Please load an image first', 'error');
      return;
    }
    
    const errors = this.gridCalculator.validateSettings(this.currentSettings, this.currentImageMetadata);
    if (errors.length > 0) {
      this.showStatus('Please fix validation errors before exporting', 'error');
      return;
    }
    
    try {
      const exportBtn = document.getElementById('export-btn') as HTMLButtonElement;
      exportBtn.disabled = true;
      exportBtn.textContent = 'Exporting...';
      
      const gridInfo = this.gridCalculator.calculateGrid(this.currentSettings, this.currentImageMetadata);
      
      // Show progress
      const progressContainer = document.getElementById('export-progress') as HTMLElement;
      const progressBar = document.getElementById('progress-bar') as HTMLElement;
      const progressText = document.getElementById('progress-text') as HTMLElement;
      progressContainer.style.display = 'block';
      
      const updateProgress = (progress: ExportProgress) => {
        progressBar.style.width = `${progress.percentage}%`;
        const eta = progress.eta ? ` (ETA: ${Math.round(progress.eta / 1000)}s)` : '';
        progressText.textContent = `${progress.current}/${progress.total} tiles${eta}`;
      };
      
      // Slice tiles
      this.showStatus('Slicing tiles...', 'info');
      const tiles = await this.slicer.sliceSprite(
        this.currentImage,
        this.currentSettings,
        gridInfo,
        updateProgress
      );
      
      // Create contact sheet if needed
      let contactSheet: HTMLCanvasElement | undefined;
      if (this.currentExportSettings.includeContactSheet) {
        this.showStatus('Creating contact sheet...', 'info');
        contactSheet = this.slicer.createContactSheet(tiles);
      }
      
      // Export to ZIP
      this.showStatus('Creating ZIP file...', 'info');
      await this.zipExporter.exportTiles(
        tiles,
        this.currentSettings,
        this.currentExportSettings,
        this.currentImageMetadata,
        contactSheet,
        updateProgress
      );
      
      this.showStatus('Export completed successfully!', 'success');
      
    } catch (error) {
      this.showStatus(`Export failed: ${(error as Error).message}`, 'error');
    } finally {
      const exportBtn = document.getElementById('export-btn') as HTMLButtonElement;
      exportBtn.disabled = false;
      exportBtn.textContent = 'Export ZIP';
      
      const progressContainer = document.getElementById('export-progress') as HTMLElement;
      progressContainer.style.display = 'none';
    }
  }

  private enableControls(enabled: boolean) {
    const controls = document.querySelectorAll('#controls input, #controls select, #controls button');
    controls.forEach(control => {
      (control as HTMLInputElement | HTMLSelectElement | HTMLButtonElement).disabled = !enabled;
    });
  }

  private showStatus(message: string, type: 'info' | 'success' | 'warning' | 'error') {
    const statusElement = document.getElementById('status') as HTMLElement;
    statusElement.textContent = message;
    statusElement.className = `status ${type}`;
    statusElement.style.display = 'block';
    
    // Auto-hide after 5 seconds for success/info messages
    if (type === 'success' || type === 'info') {
      setTimeout(() => {
        statusElement.style.display = 'none';
      }, 5000);
    }
  }

  private saveSettings() {
    const settings = {
      tile: this.currentSettings,
      export: this.currentExportSettings
    };
    localStorage.setItem('sprite-slicer-settings', JSON.stringify(settings));
  }

  private loadSettings() {
    const saved = localStorage.getItem('sprite-slicer-settings');
    if (saved) {
      try {
        const settings = JSON.parse(saved);
        if (settings.tile) {
          this.currentSettings = { ...this.currentSettings, ...settings.tile };
          this.updateInputsFromSettings();
        }
        if (settings.export) {
          this.currentExportSettings = { ...this.currentExportSettings, ...settings.export };
          this.updateExportInputsFromSettings();
        }
      } catch (error) {
        console.warn('Failed to load saved settings:', error);
      }
    }
  }

  private updateInputsFromSettings() {
    (document.getElementById('tile-width') as HTMLInputElement).value = this.currentSettings.tileWidth.toString();
    (document.getElementById('tile-height') as HTMLInputElement).value = this.currentSettings.tileHeight.toString();
    (document.getElementById('margin') as HTMLInputElement).value = this.currentSettings.margin.toString();
    (document.getElementById('spacing') as HTMLInputElement).value = this.currentSettings.spacing.toString();
    (document.getElementById('offset-x') as HTMLInputElement).value = this.currentSettings.offsetX.toString();
    (document.getElementById('offset-y') as HTMLInputElement).value = this.currentSettings.offsetY.toString();
    (document.getElementById('trim-transparent') as HTMLInputElement).checked = this.currentSettings.trimTransparent;
    (document.getElementById('preserve-padding') as HTMLInputElement).value = this.currentSettings.preservePadding.toString();
  }

  private updateExportInputsFromSettings() {
    (document.getElementById('naming-pattern') as HTMLSelectElement).value = this.currentExportSettings.namingPattern;
    (document.getElementById('custom-prefix') as HTMLInputElement).value = this.currentExportSettings.customPrefix;
    (document.getElementById('skip-transparent') as HTMLInputElement).checked = this.currentExportSettings.skipTransparent;
    (document.getElementById('include-contact-sheet') as HTMLInputElement).checked = this.currentExportSettings.includeContactSheet;
  }
}

