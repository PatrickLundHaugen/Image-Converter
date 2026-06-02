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
}