import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const SALT = process.env.ENCRYPTION_SALT || "default-salt-32-chars-long";

/**
 * Derive encryption key from master key and salt
 */
export function deriveKey(masterKey: string): Buffer {
  return crypto.pbkdf2Sync(masterKey, SALT, 100000, 32, "sha256");
}

/**
 * Encrypt content using AES-256-GCM
 */
export function encrypt(content: string, encryptionKey: string): string {
  const key = deriveKey(encryptionKey);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(content, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  // Combine: iv + authTag + encrypted
  const result = iv.toString("hex") + ":" + authTag.toString("hex") + ":" + encrypted;
  return result;
}

export function encryptBuffer(buffer: Buffer, encryptionKey: string): Buffer {
  const key = deriveKey(encryptionKey);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([iv, authTag, encrypted]);
}

export function encryptData(data: string | Buffer, encryptionKey: string): string | Buffer {
  return Buffer.isBuffer(data) ? encryptBuffer(data, encryptionKey) : encrypt(data, encryptionKey);
}

/**
 * Decrypt content using AES-256-GCM
 */
export function decrypt(encryptedData: string, encryptionKey: string): string {
  const key = deriveKey(encryptionKey);
  const parts = encryptedData.split(":");

  if (parts.length !== 3) {
    throw new Error("Invalid encrypted data format");
  }

  const iv = Buffer.from(parts[0], "hex");
  const authTag = Buffer.from(parts[1], "hex");
  const encrypted = parts[2];

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

export function decryptBuffer(encryptedData: Buffer, encryptionKey: string): Buffer {
  if (encryptedData.length < 32) {
    throw new Error("Invalid encrypted buffer format");
  }

  const key = deriveKey(encryptionKey);
  const iv = encryptedData.subarray(0, 16);
  const authTag = encryptedData.subarray(16, 32);
  const encrypted = encryptedData.subarray(32);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}

export function decryptData(encryptedData: string | Buffer, encryptionKey: string): string | Buffer {
  return Buffer.isBuffer(encryptedData)
    ? decryptBuffer(encryptedData, encryptionKey)
    : decrypt(encryptedData, encryptionKey);
}

/**
 * Hash a password using bcrypt-like approach (we'll use bcryptjs)
 */
export async function hashPassword(password: string): Promise<string> {
  const bcrypt = require("bcryptjs");
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Compare password with hash
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  const bcrypt = require("bcryptjs");
  return bcrypt.compare(password, hash);
}
