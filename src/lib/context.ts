import type { ImageItem, Format } from './types.js';

export interface AppContext {
    readonly items: ImageItem[];
    readonly selectedItem: ImageItem | null;
    readonly format: Format;
    readonly quality: number;
    readonly copyState: 'idle' | 'copied' | 'error';
    readonly downloadingZip: boolean;
    readonly cropEnabled: boolean;
    readonly crop: { x: number; y: number; width: number; height: number };
    readonly cropLockAspect: boolean;

    addFiles: (files: File[]) => void;
    selectItem: (id: string) => void;
    removeItem: (id: string) => void;
    handleFormatChange: (f: Format) => void;
    handleQualityChange: (q: number) => void;
    handleCropToggle: () => void;
    handleCropLockToggle: () => void;
    handleCropChange: (opts: { width: number; height: number }) => void;
    downloadSelected: () => void;
    copyToClipboard: () => void;
    handleDownloadAll: () => void;
    clearAll: () => void;
}

export const APP_CONTEXT_KEY = Symbol('app');