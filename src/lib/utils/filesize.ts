import type { ImageItem } from '../types.js';

export function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function savingsPercent(original: number, converted: number): number {
    return Math.round((1 - converted / original) * 100);
}

/** Savings % for any item, holding the last known value during reconversion to avoid UI flicker. */
export function itemSavings(item: ImageItem): number | null {
    if (item.converting) return item.lastSavings ?? null;
    return item.convertedSize != null
        ? savingsPercent(item.originalSize, item.convertedSize)
        : null;
}