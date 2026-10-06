import { describe, it, expect } from 'vitest';
import { canAttach, checkMediaFile } from './media';

const MB = 1024 * 1024;

describe('checkMediaFile', () => {
  it('acepta los formatos permitidos dentro de su límite', () => {
    expect(checkMediaFile({ type: 'image/jpeg', size: 5 * MB })).toBeNull();
    expect(checkMediaFile({ type: 'video/webm', size: 25 * MB })).toBeNull();
    expect(checkMediaFile({ type: 'application/pdf', size: MB })).toBeNull();
  });

  it('rechaza otros formatos y lo que pasa del límite de su tipo', () => {
    expect(checkMediaFile({ type: 'image/heic', size: 10 })).toBe(
      'UNSUPPORTED_MEDIA_TYPE',
    );
    expect(checkMediaFile({ type: '', size: 10 })).toBe(
      'UNSUPPORTED_MEDIA_TYPE',
    );
    expect(checkMediaFile({ type: 'image/png', size: 5 * MB + 1 })).toBe(
      'FILE_TOO_LARGE',
    );
    expect(checkMediaFile({ type: 'application/pdf', size: 10 * MB + 1 })).toBe(
      'FILE_TOO_LARGE',
    );
  });
});

describe('canAttach', () => {
  it('hasta 4 imágenes, o 1 video, o 1 PDF', () => {
    expect(canAttach([], 'VIDEO')).toBe(true);
    expect(canAttach(['IMAGE', 'IMAGE', 'IMAGE'], 'IMAGE')).toBe(true);
    expect(canAttach(['IMAGE', 'IMAGE', 'IMAGE', 'IMAGE'], 'IMAGE')).toBe(
      false,
    );
    expect(canAttach(['IMAGE'], 'VIDEO')).toBe(false);
    expect(canAttach(['VIDEO'], 'IMAGE')).toBe(false);
    expect(canAttach(['DOCUMENT'], 'DOCUMENT')).toBe(false);
  });
});
