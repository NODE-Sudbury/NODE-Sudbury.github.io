/** The most a logo may weigh, and what the storage buckets accept. */
export const LOGO_MAX_BYTES = 2 * 1024 * 1024;

const LOGO_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
};

export const LOGO_ACCEPT = Object.keys(LOGO_EXTENSIONS).join(',');

/** What is wrong with a chosen logo file, if anything. */
export const logoProblem = (
  file: Pick<File, 'type' | 'size'>,
  maxBytes = LOGO_MAX_BYTES,
): 'type' | 'size' | undefined => {
  if (!(file.type in LOGO_EXTENSIONS)) return 'type';
  if (file.size > maxBytes) return 'size';
  return undefined;
};

/** The file extension for a logo's type, which is where its name in storage ends. */
export const logoExtension = (type: string): string => LOGO_EXTENSIONS[type] ?? 'img';
