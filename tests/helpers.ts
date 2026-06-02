import { vi, beforeEach } from 'vitest';

export const mockCreateObjectURL = vi.fn(() => 'blob:mock-url');
export const mockRevokeObjectURL = vi.fn();

export function setupUrlMock() {
    beforeEach(() => {
        vi.stubGlobal('URL', {
            createObjectURL: mockCreateObjectURL,
            revokeObjectURL: mockRevokeObjectURL,
        });
        mockCreateObjectURL.mockClear();
        mockRevokeObjectURL.mockClear();
    });
    // No afterEach — re-stubbing in beforeEach is sufficient,
    // and unstubAllGlobals() was also removing the Image mock between tests.
}