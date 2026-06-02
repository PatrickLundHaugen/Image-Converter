import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import DropZone from '../../src/lib/components/DropZone.svelte';
import { setupUrlMock } from '../helpers.js';

setupUrlMock();

function makeImageFile(name = 'photo.jpg', type = 'image/jpeg') {
    return new File([''], name, { type });
}

function makeDropEvent(files: File[]) {
    return {
        dataTransfer: { files },
        preventDefault: vi.fn(),
    };
}

describe('DropZone', () => {
    it('calls onfiles with image files when dropped', async () => {
        const onfiles = vi.fn();
        const { getByRole } = render(DropZone, { onfiles });
        const zone = getByRole('button');
        const file = makeImageFile();

        await fireEvent.drop(zone, makeDropEvent([file]));

        expect(onfiles).toHaveBeenCalledWith([file]);
    });

    it('filters out non-image files on drop', async () => {
        const onfiles = vi.fn();
        const { getByRole } = render(DropZone, { onfiles });
        const zone = getByRole('button');
        const textFile = new File([''], 'doc.txt', { type: 'text/plain' });

        await fireEvent.drop(zone, makeDropEvent([textFile]));

        expect(onfiles).not.toHaveBeenCalled();
    });

    it('passes only image files when mixed with non-image files', async () => {
        const onfiles = vi.fn();
        const { getByRole } = render(DropZone, { onfiles });
        const zone = getByRole('button');
        const imgFile = makeImageFile();
        const txtFile = new File([''], 'readme.txt', { type: 'text/plain' });

        await fireEvent.drop(zone, makeDropEvent([imgFile, txtFile]));

        expect(onfiles).toHaveBeenCalledWith([imgFile]);
    });

    it('calls onfiles when a paste event contains an image', async () => {
        const onfiles = vi.fn();
        render(DropZone, { onfiles });

        const imageFile = makeImageFile('pasted.png', 'image/png');
        const pasteEvent = new Event('paste');
        Object.defineProperty(pasteEvent, 'clipboardData', {
            value: {
                items: [{ type: 'image/png', getAsFile: () => imageFile }],
            },
        });

        window.dispatchEvent(pasteEvent);

        expect(onfiles).toHaveBeenCalledWith([imageFile]);
    });
});