export type Format = 'image/png' | 'image/jpeg' | 'image/webp';
export type Theme  = 'light' | 'dark' | 'system';

export interface CropOptions {
    enabled: boolean;
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface ImageItem {
    id: string;
    file: File;
    name: string;
    originalSize: number;
    width: number;
    height: number;
    convertedBlob: Blob | null;
    convertedSize: number | null;
    converting: boolean;
    error: string | null;
    /** True for HEIC/HEIF files the browser can't decode — conversion will never succeed. */
    unsupported: boolean;
    /** Incremented at the start of each conversion; used to discard stale results from races. */
    conversionId: number;
    /** Object URL for the original file thumbnail — created once and revoked on removal. */
    thumbnailUrl: string;
    /** Last successfully converted savings %, retained across reconversions to prevent UI flicker. */
    lastSavings: number | null;
}

/** Human-readable labels for each output format. Single source of truth used across components. */
export const FORMAT_LABELS: Record<Format, string> = {
    'image/png':  'PNG',
    'image/jpeg': 'JPEG',
    'image/webp': 'WebP',
};