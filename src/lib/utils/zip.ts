import JSZip from 'jszip';
import type { Format, ImageItem } from '../types.js';

export function getExtension(format: Format): string {
    const map: Record<Format, string> = {
        'image/png': 'png',
        'image/jpeg': 'jpg',
        'image/webp': 'webp',
    };
    return map[format];
}

export function getOutputFilename(originalName: string, format: Format): string {
    const base = originalName.replace(/\.[^/.]+$/, '');
    return `${base}.${getExtension(format)}`;
}

export async function downloadBlob(blob: Blob, filename: string): Promise<void> {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

export async function downloadAllAsZip(
    items: ImageItem[],
    format: Format
): Promise<void> {
    const zip = new JSZip();

    for (const item of items) {
        if (item.convertedBlob) {
            zip.file(getOutputFilename(item.name, format), item.convertedBlob);
        }
    }

    const content = await zip.generateAsync({ type: 'blob' });
    await downloadBlob(content, 'converted-images.zip');
}