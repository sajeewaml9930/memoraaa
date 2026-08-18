import sharp from "sharp";
import fs from "fs";
import path from "path";

/**
 * Compress an image file
 */
export async function compressImage(
  inputPath: string,
  outputPath: string,
  options?: {
    width?: number;
    height?: number;
    quality?: number;
  }
): Promise<void> {
  try {
    let transform = sharp(inputPath);

    if (options?.width || options?.height) {
      transform = transform.resize(options.width, options.height, {
        fit: "inside",
        withoutEnlargement: true,
      });
    }

    await transform
      .jpeg({ quality: options?.quality || 80 })
      .toFile(outputPath);
  } catch (error) {
    console.error("Error compressing image:", error);
    throw error;
  }
}

/**
 * Get image metadata
 */
export async function getImageMetadata(inputPath: string) {
  try {
    return await sharp(inputPath).metadata();
  } catch (error) {
    console.error("Error reading image metadata:", error);
    throw error;
  }
}

/**
 * Crop an image
 */
export async function cropImage(
  inputPath: string,
  outputPath: string,
  left: number,
  top: number,
  width: number,
  height: number
): Promise<void> {
  try {
    await sharp(inputPath)
      .extract({ left, top, width, height })
      .toFile(outputPath);
  } catch (error) {
    console.error("Error cropping image:", error);
    throw error;
  }
}

/**
 * Apply grayscale filter to image
 */
export async function applyGrayscale(
  inputPath: string,
  outputPath: string
): Promise<void> {
  try {
    await sharp(inputPath).grayscale().toFile(outputPath);
  } catch (error) {
    console.error("Error applying grayscale:", error);
    throw error;
  }
}

/**
 * Get video duration and metadata
 * Note: Requires ffprobe to be installed
 */
export async function getVideoMetadata(videoPath: string) {
  try {
    const ffprobe = require("fluent-ffmpeg").ffprobe;

    return new Promise((resolve, reject) => {
      ffprobe(videoPath, (err: any, data: any) => {
        if (err) reject(err);
        else resolve(data);
      });
    });
  } catch (error) {
    console.error("Error getting video metadata:", error);
    throw error;
  }
}

/**
 * Get file size in human-readable format
 */
export function getFileSizeInMB(bytes: number): number {
  return Math.round((bytes / (1024 * 1024)) * 100) / 100;
}

/**
 * Validate file type
 */
export function isValidImageType(mimeType: string): boolean {
  const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  return validTypes.includes(mimeType);
}

export function isValidVideoType(mimeType: string): boolean {
  const validTypes = ["video/mp4", "video/webm", "video/quicktime"];
  return validTypes.includes(mimeType);
}

export function isValidAudioType(mimeType: string): boolean {
  const validTypes = ["audio/mpeg", "audio/wav", "audio/ogg", "audio/m4a"];
  return validTypes.includes(mimeType);
}

/**
 * Generate a thumbnail from a video (requires ffmpeg)
 */
export async function generateVideoThumbnail(
  videoPath: string,
  outputPath: string,
  timestamp: string = "00:00:01"
): Promise<void> {
  try {
    const ffmpeg = require("fluent-ffmpeg");

    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .on("error", (err: any) => {
          reject(err);
        })
        .on("end", () => {
          resolve();
        })
        .screenshots({
          count: 1,
          folder: path.dirname(outputPath),
          filename: path.basename(outputPath),
          timestamps: [timestamp],
        });
    });
  } catch (error) {
    console.error("Error generating video thumbnail:", error);
    throw error;
  }
}
