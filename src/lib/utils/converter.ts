import type { Format, CropOptions } from '../types.js';

export function isUnsupportedFormat(file: File): boolean {
    const type = file.type.toLowerCase();
    const name = file.name.toLowerCase();
    return (
        type === 'image/heic' ||
        type === 'image/heif' ||
        name.endsWith('.heic') ||
        name.endsWith('.heif')
    );
}

export async function convertImage(
    file: File,
    format: Format,
    quality: number,
    crop?: CropOptions
): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);

        img.onload = () => {
            // SVGs without explicit width/height return 0 in Chrome — fall back to 1000px
            const naturalW = img.naturalWidth  || 1000;
            const naturalH = img.naturalHeight || 1000;

            const srcX = crop?.enabled ? crop.x : 0;
            const srcY = crop?.enabled ? crop.y : 0;
            const srcW = crop?.enabled ? crop.width  : naturalW;
            const srcH = crop?.enabled ? crop.height : naturalH;

            const canvas = document.createElement('canvas');
            canvas.width  = srcW;
            canvas.height = srcH;
            const ctx = canvas.getContext('2d')!;

            if (format === 'image/jpeg') {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, srcW, srcH);
            }

            // drawImage(source, sx, sy, sw, sh, dx, dy, dw, dh)
            ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, srcW, srcH);
            URL.revokeObjectURL(url);

            canvas.toBlob(
                (blob) => {
                    if (blob) resolve(blob);
                    else reject(new Error('Conversion failed'));
                },
                format,
                format === 'image/png' ? undefined : quality / 100
            );
        };

        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Failed to load image')); };
        img.src = url;
    });
}

export function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            const width  = img.naturalWidth  || 1000;
            const height = img.naturalHeight || 1000;
            URL.revokeObjectURL(url);
            resolve({ width, height });
        };
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Failed to read image dimensions')); };
        img.src = url;
    });
}