import sharp from "sharp";

export async function normalizeImageOrientation(
  input: Buffer,
): Promise<Buffer> {
  return sharp(input).rotate().toBuffer();
}

export const MAX_IMAGE_DIMENSION = 2048;
export const THUMBNAIL_SIZE = 200;
export const IMAGE_QUALITY = 80;

export async function compressImage(buffer: Buffer): Promise<Buffer> {
  const image = sharp(buffer);
  const metadata = await image.metadata();
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;

  const shouldResize =
    width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION;

  const pipeline = shouldResize
    ? sharp(buffer).resize({
        width: width > height ? MAX_IMAGE_DIMENSION : undefined,
        height: height > width ? MAX_IMAGE_DIMENSION : undefined,
        fit: "inside",
        withoutEnlargement: true,
      })
    : sharp(buffer);

  return pipeline
    .jpeg({ quality: IMAGE_QUALITY, progressive: true })
    .toBuffer();
}

export async function generateThumbnail(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 75 })
    .toBuffer();
}
