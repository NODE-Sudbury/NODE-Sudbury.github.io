import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { publishedBase, takePublishedData } from './open-source-fallback.mjs';

const published = (generatedAt: string) => ({
  org: 'NODE-Sudbury',
  generatedAt,
  projects: [
    {
      name: 'Site',
      contributors: [
        { login: 'ada', contributions: 269, avatar: '/images/github/ada.png' },
        { login: 'grace', contributions: 12, avatar: '/images/github/grace.jpg' },
        { login: 'evil', contributions: 1, avatar: '/images/github/../../etc/passwd' },
        { login: 'plain', contributions: 1 },
      ],
    },
  ],
});

const reply = (body: unknown, ok = true, status = 200) =>
  ({
    ok,
    status,
    json: async () => body,
    arrayBuffer: async () => new TextEncoder().encode('image-bytes').buffer,
  }) as unknown as Response;

describe('open source fallback', () => {
  let dir: string;
  let out: string;
  let imagesDir: string;
  const warn = vi.fn();

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'open-source-'));
    out = join(dir, 'open-source.json');
    imagesDir = join(dir, 'images');
    warn.mockClear();
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('says where the published data is, for any repository', () => {
    expect(publishedBase('NODE-Sudbury/NODE-Sudbury.github.io')).toBe(
      'https://raw.githubusercontent.com/NODE-Sudbury/NODE-Sudbury.github.io/open-source-data',
    );
  });

  it('takes the published data, and the avatars it names, when it is newer', async () => {
    writeFileSync(out, JSON.stringify({ generatedAt: '2026-10-13T00:00:00Z', projects: [] }));
    const fetchFn = vi.fn(async (url: string) =>
      url.endsWith('open-source.json') ? reply(published('2026-10-14T09:17:00Z')) : reply(null),
    );

    const taken = await takePublishedData({
      base: 'https://data.example',
      out,
      imagesDir,
      fetchFn,
      warn,
    });

    expect(taken).toBe(true);
    expect(JSON.parse(readFileSync(out, 'utf8')).generatedAt).toBe('2026-10-14T09:17:00Z');
    expect(readFileSync(join(imagesDir, 'ada.png'), 'utf8')).toBe('image-bytes');
    expect(existsSync(join(imagesDir, 'grace.jpg'))).toBe(true);
    expect(fetchFn).toHaveBeenCalledWith('https://data.example/images/ada.png');
  });

  it('never fetches or writes an avatar whose name is not a plain file name', async () => {
    const fetchFn = vi.fn(async (url: string) =>
      url.endsWith('open-source.json') ? reply(published('2026-10-14T09:17:00Z')) : reply(null),
    );

    await takePublishedData({ base: 'https://data.example', out, imagesDir, fetchFn, warn });

    expect(fetchFn.mock.calls.map(([url]) => url).some((url) => url.includes('passwd'))).toBe(
      false,
    );
    expect(existsSync(join(dir, 'etc'))).toBe(false);
  });

  it('keeps what the build has when it is as new, or newer', async () => {
    writeFileSync(out, JSON.stringify({ generatedAt: '2026-10-15T00:00:00Z', projects: [] }));
    const fetchFn = vi.fn(async () => reply(published('2026-10-14T09:17:00Z')));

    expect(
      await takePublishedData({ base: 'https://data.example', out, imagesDir, fetchFn, warn }),
    ).toBe(false);
    expect(JSON.parse(readFileSync(out, 'utf8')).generatedAt).toBe('2026-10-15T00:00:00Z');
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('takes it when the build has no data at all', async () => {
    const fetchFn = vi.fn(async (url: string) =>
      url.endsWith('open-source.json')
        ? reply(published('2026-10-14T09:17:00Z'))
        : reply(null, false, 404),
    );

    expect(
      await takePublishedData({ base: 'https://data.example', out, imagesDir, fetchFn, warn }),
    ).toBe(true);
    expect(existsSync(out)).toBe(true);
  });

  it('takes nothing when nothing is published, or it is not in the expected shape', async () => {
    expect(
      await takePublishedData({
        base: 'https://data.example',
        out,
        imagesDir,
        fetchFn: async () => reply(null, false, 404),
        warn,
      }),
    ).toBe(false);
    expect(warn).toHaveBeenCalledWith('No published open source data (404).');

    expect(
      await takePublishedData({
        base: 'https://data.example',
        out,
        imagesDir,
        fetchFn: async () => reply({ nope: true }),
        warn,
      }),
    ).toBe(false);
    expect(existsSync(out)).toBe(false);
  });
});
