import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

const STORAGE_ROOT = process.env.LOCAL_STORAGE_DIR || path.join(process.cwd(), "storage", "uploads");
const STORAGE_INDEX_PATH = path.join(STORAGE_ROOT, ".index.json");

export function getStorageRoot(): string {
  return STORAGE_ROOT;
}

export function saveFile(fileBuffer: Buffer, fileName: string, userId: number): string {
  const safeName = fileName.replace(/[^a-zA-Z0-9_.-]/g, "_");
  const extension = path.extname(safeName) || ".bin";
  const dateFolder = new Date().toISOString().slice(0, 10);
  const userFolder = `user_${userId}`;
  const folder = path.join(STORAGE_ROOT, userFolder, dateFolder);

  fs.mkdirSync(folder, { recursive: true });

  const finalFileName = `${Date.now()}-${randomUUID()}${extension}`;
  const filePath = path.join(folder, finalFileName);
  fs.writeFileSync(filePath, fileBuffer);

  const relativePath = path.relative(process.cwd(), filePath).replace(/\\/g, "/");
  return relativePath;
}

export function getFile(filePath: string): Buffer {
  const resolvedPath = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(process.cwd(), filePath);

  return fs.readFileSync(resolvedPath);
}

export function deleteFile(filePath: string): void {
  const resolvedPath = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(process.cwd(), filePath);

  if (fs.existsSync(resolvedPath)) {
    fs.unlinkSync(resolvedPath);
  }
}

type StoredFileRecord = {
  id: string;
  name: string;
  storedFileName: string;
  mimeType: string;
  size: number;
  createdAt: string;
};

function ensureStorageRoot(): void {
  fs.mkdirSync(STORAGE_ROOT, { recursive: true });

  if (!fs.existsSync(STORAGE_INDEX_PATH)) {
    fs.writeFileSync(STORAGE_INDEX_PATH, JSON.stringify({}, null, 2), "utf8");
  }
}

function readStorageIndex(): Record<string, StoredFileRecord> {
  ensureStorageRoot();

  try {
    const raw = fs.readFileSync(STORAGE_INDEX_PATH, "utf8");
    return JSON.parse(raw || "{}") as Record<string, StoredFileRecord>;
  } catch (error) {
    console.warn("Failed to read local storage index, resetting it.", error);
    fs.writeFileSync(STORAGE_INDEX_PATH, JSON.stringify({}, null, 2), "utf8");
    return {};
  }
}

function writeStorageIndex(index: Record<string, StoredFileRecord>): void {
  ensureStorageRoot();
  fs.writeFileSync(STORAGE_INDEX_PATH, JSON.stringify(index, null, 2), "utf8");
}

function sanitizeFileName(fileName: string): string {
  const normalized = fileName.replace(/[\\/:*?"<>|]/g, "_").trim();
  return normalized || "file";
}

function getFileExtensionFromMime(mimeType: string): string {
  const extMap: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "video/mp4": ".mp4",
    "video/webm": ".webm",
    "video/quicktime": ".mov",
    "audio/mpeg": ".mp3",
    "audio/wav": ".wav",
    "audio/ogg": ".ogg",
    "audio/m4a": ".m4a",
    "application/pdf": ".pdf",
  };

  return extMap[mimeType] || "";
}

function resolveStoredFilePath(fileId: string): string {
  const index = readStorageIndex();
  const record = index[fileId];

  if (!record) {
    throw new Error(`Local storage record not found for fileId: ${fileId}`);
  }

  return path.join(STORAGE_ROOT, record.storedFileName);
}

/**
 * Upload a file to the local filesystem storage
 */
export async function uploadToLocalStorage(
  filePath: string,
  fileName: string,
  mimeType: string
): Promise<string> {
  try {
    ensureStorageRoot();

    const fileId = randomUUID();
    const extension = path.extname(sanitizeFileName(fileName)) || getFileExtensionFromMime(mimeType);
    const storedFileName = `${fileId}${extension}`;
    const destinationPath = path.join(STORAGE_ROOT, storedFileName);
    const stats = fs.statSync(filePath);

    fs.copyFileSync(filePath, destinationPath);

    const index = readStorageIndex();
    index[fileId] = {
      id: fileId,
      name: sanitizeFileName(fileName),
      storedFileName,
      mimeType,
      size: stats.size,
      createdAt: new Date().toISOString(),
    };

    writeStorageIndex(index);
    return fileId;
  } catch (error) {
    console.error("Error uploading file to local storage:", error);
    throw error;
  }
}

export const uploadToGoogleDrive = uploadToLocalStorage;

/**
 * Download a file from local storage
 */
export async function downloadFromLocalStorage(
  fileId: string,
  outputPath: string
): Promise<void> {
  try {
    const sourcePath = resolveStoredFilePath(fileId);
    const directory = path.dirname(outputPath);

    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
    }

    fs.copyFileSync(sourcePath, outputPath);
  } catch (error) {
    console.error("Error downloading file from local storage:", error);
    throw error;
  }
}

export const downloadFromGoogleDrive = downloadFromLocalStorage;

/**
 * Delete a file from local storage
 */
export async function deleteFromLocalStorage(fileId: string): Promise<void> {
  try {
    const sourcePath = resolveStoredFilePath(fileId);
    const index = readStorageIndex();

    if (fs.existsSync(sourcePath)) {
      fs.unlinkSync(sourcePath);
    }

    delete index[fileId];
    writeStorageIndex(index);
  } catch (error) {
    console.error("Error deleting file from local storage:", error);
    throw error;
  }
}

export const deleteFromGoogleDrive = deleteFromLocalStorage;

/**
 * Get file metadata from local storage
 */
export async function getLocalFileMetadata(fileId: string) {
  try {
    const index = readStorageIndex();
    const record = index[fileId];

    if (!record) {
      throw new Error(`Local storage record not found for fileId: ${fileId}`);
    }

    return {
      id: record.id,
      name: record.name,
      mimeType: record.mimeType,
      size: record.size,
      createdTime: record.createdAt,
    };
  } catch (error) {
    console.error("Error getting file metadata from local storage:", error);
    throw error;
  }
}

export const getGoogleDriveFileMetadata = getLocalFileMetadata;
