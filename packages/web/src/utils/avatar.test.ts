import { describe, expect, it } from 'vitest';
import { avatarProblem, centeredSquare } from './avatar';

describe('avatarProblem', () => {
  const max = 5 * 1024 * 1024;

  it('accepts a JPEG, PNG or WebP within the size limit', () => {
    for (const type of ['image/jpeg', 'image/png', 'image/webp']) {
      expect(avatarProblem({ type, size: 1000 }, max)).toBeUndefined();
    }
  });

  it('refuses other kinds of file and files over the limit', () => {
    expect(avatarProblem({ type: 'image/gif', size: 1000 }, max)).toBe('type');
    expect(avatarProblem({ type: 'application/pdf', size: 1000 }, max)).toBe('type');
    expect(avatarProblem({ type: 'image/png', size: max + 1 }, max)).toBe('size');
  });
});

describe('centeredSquare', () => {
  it('cuts the sides off a wide photo', () => {
    expect(centeredSquare(1600, 900)).toEqual({ x: 350, y: 0, side: 900 });
  });

  it('cuts the top and bottom off a tall photo', () => {
    expect(centeredSquare(900, 1600)).toEqual({ x: 0, y: 350, side: 900 });
  });

  it('keeps a square photo whole', () => {
    expect(centeredSquare(500, 500)).toEqual({ x: 0, y: 0, side: 500 });
  });
});
