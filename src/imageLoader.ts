import type { ImageMetadata } from './types';

export class ImageLoader {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private image: HTMLImageElement | null = null;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
  }

  async loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith('image/png')) {
        reject(new Error('Only PNG files are supported'));
        return;
      }

      const img = new Image();
      img.onload = () => {
        this.image = img;
        resolve(img);
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }

  getImageMetadata(image: HTMLImageElement): ImageMetadata {
    this.canvas.width = image.width;
    this.canvas.height = image.height;
    this.ctx.drawImage(image, 0, 0);

    const imageData = this.ctx.getImageData(0, 0, image.width, image.height);
    const hasAlpha = this.checkAlphaChannel(imageData);

    return {
      width: image.width,
      height: image.height,
      hasAlpha
    };
  }

  private checkAlphaChannel(imageData: ImageData): boolean {
    const data = imageData.data;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < 255) {
        return true;
      }
    }
    return false;
  }

  getCurrentImage(): HTMLImageElement | null {
    return this.image;
  }
}

