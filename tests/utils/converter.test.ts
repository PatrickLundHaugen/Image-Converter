import { describe, it, expect, vi, beforeEach } from 'vitest';
import { convertImage, getImageDimensions } from '../../src/lib/utils/converter.js';
import { setupUrlMock, mockRevokeObjectURL } from '../helpers.js';

interface ImageLike {
    naturalWidth: number;
    naturalHeight: number;
    onload: (() => void) | null;
    onerror: ((e: unknown) => void) | null;
    src: string;
}

class MockImage implements ImageLike {
    naturalWidth = 800;
    naturalHeight = 600;
    onload: (() => void) | null = null;
    onerror: ((e: unknown) => void) | null = null;

    set src(_: string) {
        queueMicrotask(() => this.onload?.());
    }

    get src(): string {
        return '';
    }
}

setupUrlMock();

let drawSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
    vi.stubGlobal('Image', MockImage);
    drawSpy = vi.spyOn(CanvasRenderingContext2D.prototype, 'drawImage').mockImplementation(() => {});
});

const mockFile = new File([''], 'test.png', { type: 'image/png' });

describe('convertImage', () => {
    it('resolves with a Blob on success', async () => {
        const blob = await convertImage(mockFile, 'image/webp', 85);
        expect(blob).toBeInstanceOf(Blob);
    });

    it('revokes the object URL after loading', async () => {
        await convertImage(mockFile, 'image/png', 85);
        expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    });

    it('does not pass quality for PNG', async () => {
        const canvas = document.createElement('canvas');
        const toBlobSpy = vi.spyOn(canvas, 'toBlob');
        vi.spyOn(document, 'createElement').mockReturnValueOnce(canvas);

        await convertImage(mockFile, 'image/png', 85);

        expect(toBlobSpy).toHaveBeenCalledWith(
            expect.any(Function),
            'image/png',
            undefined
        );
    });

    it('passes quality as a 0–1 fraction for JPEG', async () => {
        const canvas = document.createElement('canvas');
        const toBlobSpy = vi.spyOn(canvas, 'toBlob');
        vi.spyOn(document, 'createElement').mockReturnValueOnce(canvas);

        await convertImage(mockFile, 'image/jpeg', 80);

        expect(toBlobSpy).toHaveBeenCalledWith(
            expect.any(Function),
            'image/jpeg',
            0.8
        );
    });

    it('fills white background before drawing for JPEG', async () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        vi.spyOn(document, 'createElement').mockReturnValueOnce(canvas);
        vi.spyOn(canvas, 'getContext').mockReturnValue(ctx);

        await convertImage(mockFile, 'image/jpeg', 85);

        expect(ctx.fillStyle).toBe('#ffffff');
    });

    it('does not fill white background for PNG', async () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        vi.spyOn(document, 'createElement').mockReturnValueOnce(canvas);
        vi.spyOn(canvas, 'getContext').mockReturnValue(ctx);

        // Set a known baseline — the converter should leave this untouched for PNG
        ctx.fillStyle = '#000000';

        await convertImage(mockFile, 'image/png', 85);

        expect(ctx.fillStyle).toBe('#000000');
    });
});

describe('getImageDimensions', () => {
    it('returns natural dimensions from the image', async () => {
        const dims = await getImageDimensions(mockFile);
        expect(dims).toEqual({ width: 800, height: 600 });
    });

    it('revokes the object URL after reading dimensions', async () => {
        await getImageDimensions(mockFile);
        expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    });
});

describe('crop behaviour', () => {
    it('uses full image dimensions when no crop is provided', async () => {
        const canvas = document.createElement('canvas');
        vi.spyOn(document, 'createElement').mockReturnValueOnce(canvas);

        await convertImage(mockFile, 'image/webp', 85);

        expect(canvas.width).toBe(800);
        expect(canvas.height).toBe(600);
    });

    it('sets canvas to crop dimensions when crop is enabled', async () => {
        const canvas = document.createElement('canvas');
        vi.spyOn(document, 'createElement').mockReturnValueOnce(canvas);

        await convertImage(mockFile, 'image/webp', 85, {
            enabled: true, x: 100, y: 50, width: 400, height: 300,
        });

        expect(canvas.width).toBe(400);
        expect(canvas.height).toBe(300);
    });

    it('calls drawImage with the correct source region when cropping', async () => {
        await convertImage(mockFile, 'image/webp', 85, {
            enabled: true, x: 100, y: 50, width: 400, height: 300,
        });

        // drawImage(source, srcX, srcY, srcW, srcH, dstX, dstY, dstW, dstH)
        expect(drawSpy).toHaveBeenCalledWith(
            expect.anything(),
            100, 50, 400, 300,
            0, 0, 400, 300
        );
    });

    it('ignores crop region when crop is disabled', async () => {
        const canvas = document.createElement('canvas');
        vi.spyOn(document, 'createElement').mockReturnValueOnce(canvas);

        await convertImage(mockFile, 'image/webp', 85, {
            enabled: false, x: 100, y: 50, width: 400, height: 300,
        });

        expect(canvas.width).toBe(800);
        expect(canvas.height).toBe(600);
    });
});