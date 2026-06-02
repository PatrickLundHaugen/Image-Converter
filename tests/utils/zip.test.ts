import { describe, it, expect } from 'vitest';
import { getExtension, getOutputFilename } from '../../src/lib/utils/zip.js';

describe('getExtension', () => {
    it('returns png for image/png', () => {
        expect(getExtension('image/png')).toBe('png');
    });

    it('returns jpg for image/jpeg', () => {
        expect(getExtension('image/jpeg')).toBe('jpg');
    });

    it('returns webp for image/webp', () => {
        expect(getExtension('image/webp')).toBe('webp');
    });
});

describe('getOutputFilename', () => {
    it('replaces extension with target format', () => {
        expect(getOutputFilename('photo.png', 'image/webp')).toBe('photo.webp');
    });

    it('handles jpeg extension', () => {
        expect(getOutputFilename('photo.jpeg', 'image/png')).toBe('photo.png');
    });

    it('handles files without an extension', () => {
        expect(getOutputFilename('photo', 'image/jpeg')).toBe('photo.jpg');
    });

    it('only replaces the last extension when name has multiple dots', () => {
        expect(getOutputFilename('my.photo.jpg', 'image/webp')).toBe('my.photo.webp');
    });

    it('preserves the base name', () => {
        expect(getOutputFilename('screenshot-2024.png', 'image/jpeg')).toBe(
            'screenshot-2024.jpg'
        );
    });
});