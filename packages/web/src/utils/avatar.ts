/** The size, in pixels, of the square photo that is saved. */
export const AVATAR_SIZE = 400;

export const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/** What is wrong with a file picked as a photo, or nothing when it is fine. */
export const avatarProblem = (
  file: Pick<File, 'type' | 'size'>,
  maxBytes: number,
): 'type' | 'size' | undefined => {
  if (!AVATAR_TYPES.includes(file.type)) return 'type';
  if (file.size > maxBytes) return 'size';
  return undefined;
};

/** The square, centered part of an image of the given size: where to cut and how much. */
export const centeredSquare = (width: number, height: number) => {
  const side = Math.min(width, height);
  return { x: Math.round((width - side) / 2), y: Math.round((height - side) / 2), side };
};

/**
 * A photo cut to a centered square and scaled to `AVATAR_SIZE`, as a JPEG. The cutting happens
 * in the browser, so a large photo is never uploaded.
 */
export const cropToSquare = async (file: Blob): Promise<Blob> => {
  const image = await createImageBitmap(file);
  const { x, y, side } = centeredSquare(image.width, image.height);
  const canvas = document.createElement('canvas');
  canvas.width = AVATAR_SIZE;
  canvas.height = AVATAR_SIZE;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas is not available.');
  context.drawImage(image, x, y, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE);
  image.close();
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('The photo could not be saved.'))),
      'image/jpeg',
      0.92,
    );
  });
};
