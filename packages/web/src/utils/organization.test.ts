import { describe, expect, it } from 'vitest';
import { LOGO_MAX_BYTES, logoExtension, logoProblem } from './organization';

describe('logoProblem', () => {
  it('takes JPG, PNG, WebP and SVG logos up to 2 MB', () => {
    for (const type of ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']) {
      expect(logoProblem({ type, size: 1000 })).toBeUndefined();
    }
    expect(logoProblem({ type: 'image/png', size: LOGO_MAX_BYTES })).toBeUndefined();
  });

  it('refuses other files, and files that are too big', () => {
    expect(logoProblem({ type: 'application/pdf', size: 1000 })).toBe('type');
    expect(logoProblem({ type: 'image/gif', size: 1000 })).toBe('type');
    expect(logoProblem({ type: 'image/png', size: LOGO_MAX_BYTES + 1 })).toBe('size');
  });
});

describe('logoExtension', () => {
  it('names the extension for a type', () => {
    expect(logoExtension('image/jpeg')).toBe('jpg');
    expect(logoExtension('image/svg+xml')).toBe('svg');
    expect(logoExtension('text/plain')).toBe('img');
  });
});
