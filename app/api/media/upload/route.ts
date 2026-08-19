import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { randomUUID } from "crypto";
import { authConfig } from "@/app/lib/auth";
import prisma from "@/app/lib/prisma";
import { encryptData } from "@/app/lib/encryption";
import { saveFile } from "@/app/lib/storage";
import { compressImage, generateThumbnail } from "@/app/lib/image-processor";
import { compressVideo, extractVideoThumbnail, getVideoDuration } from "@/app/lib/video-processor";
import { compressAudio, getAudioDuration } from "@/app/lib/audio-processor";
import { emitToAlbum } from "@/app/lib/socket";

const MAX_IMAGE_SIZE = 20 * 1024 * 1024;
const MAX_VIDEO_SIZE = 100 * 1024 * 1024;
const MAX_AUDIO_SIZE = 25 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/x-msvideo",
]);

function normalizeMimeType(mimeType: string): string {
  return mimeType.split(";")[0].trim().toLowerCase();
}

function isValidImageType(mimeType: string): boolean {
  const normalizedMimeType = normalizeMimeType(mimeType);
  return ALLOWED_MIME_TYPES.has(normalizedMimeType) && normalizedMimeType.startsWith("image/");
}

function isValidVideoType(mimeType: string): boolean {
  const normalizedMimeType = normalizeMimeType(mimeType);
  return ALLOWED_MIME_TYPES.has(normalizedMimeType) && normalizedMimeType.startsWith("video/");
}

const ALLOWED_AUDIO_MIME_TYPES = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/aac",
  "audio/x-m4a",
  "audio/webm",
  "audio/ogg",
  "audio/wav",
  "audio/x-wav",
]);

function isValidAudioType(mimeType: string): boolean {
  const normalizedMimeType = normalizeMimeType(mimeType);
  return ALLOWED_AUDIO_MIME_TYPES.has(normalizedMimeType) && normalizedMimeType.startsWith("audio/");
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number(session.user.id);

    if (!Number.isFinite(userId)) {
      return NextResponse.json({ error: "Invalid user" }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const albumIdValue = formData.get("albumId");
    const captionValue = formData.get("caption");
    const keepOriginalQualityValue = formData.get("keepOriginalQuality");
    const startTimeValue = formData.get("startTime");
    const endTimeValue = formData.get("endTime");
    const isStoryValue = formData.get("isStory");
    const moodValue = formData.get("mood");
    const caption = typeof captionValue === "string" ? captionValue.trim().slice(0, 200) : "";
    const keepOriginalQuality = keepOriginalQualityValue === "true" || keepOriginalQualityValue === "1";
    const isStory = isStoryValue === "true" || isStoryValue === "1";
    const normalizedMood = typeof moodValue === "string" ? moodValue.trim().toLowerCase() : null;
    const isVideoUpload = file instanceof File && file.type.toLowerCase().startsWith("video/");
    const startTime = Number(startTimeValue ?? 0);
    const endTime = Number(endTimeValue ?? 0);
    const albumId = Number(albumIdValue ?? 0);

    if (!isStory && (!Number.isFinite(albumId) || albumId <= 0)) {
      return NextResponse.json({ error: "Album is required" }, { status: 400 });
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const normalizedFileType = normalizeMimeType(file.type);
    const isImageUpload = normalizedFileType.startsWith("image/");
    const isAudioUpload = normalizedFileType.startsWith("audio/");

    if (!isImageUpload && !isVideoUpload && !isAudioUpload) {
      return NextResponse.json(
        { error: "Unsupported file type. Please upload an image, video, or audio recording." },
        { status: 400 }
      );
    }

    if (isImageUpload && !isValidImageType(normalizedFileType)) {
      return NextResponse.json(
        { error: "Unsupported image type. Please upload JPG, PNG, WebP, or GIF." },
        { status: 400 }
      );
    }

    if (isVideoUpload && !isValidVideoType(normalizedFileType)) {
      return NextResponse.json(
        { error: "Unsupported video type. Please upload MP4, MOV, WebM, or AVI." },
        { status: 400 }
      );
    }

    if (isAudioUpload && !isValidAudioType(normalizedFileType)) {
      return NextResponse.json(
        { error: "Unsupported audio type. Please upload MP3, M4A, AAC, WAV, WebM, or OGG audio." },
        { status: 400 }
      );
    }

    if (isImageUpload && file.size > MAX_IMAGE_SIZE) {
      return NextResponse.json(
        { error: "Image must be 20MB or smaller." },
        { status: 400 }
      );
    }

    if (isVideoUpload && file.size > MAX_VIDEO_SIZE) {
      return NextResponse.json(
        { error: "Video must be 100MB or smaller." },
        { status: 400 }
      );
    }

    if (isAudioUpload && file.size > MAX_AUDIO_SIZE) {
      return NextResponse.json(
        { error: "Voice message must be 25MB or smaller." },
        { status: 400 }
      );
    }

    let album: { id: number } | null = null;
    if (!isStory) {
      album = await prisma.album.findFirst({
        where: {
          id: albumId,
          OR: [
            { userId },
            { sharedAlbums: { some: { userId, accepted: true, permission: { in: ["edit", "admin"] } } } },
          ],
        },
      });

      if (!album) {
        return NextResponse.json({ error: "Album not found or access denied" }, { status: 404 });
      }
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { encryptionKey: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer()) as Buffer;

    let processedBuffer: Buffer = Buffer.from(fileBuffer);
    let thumbnailBuffer: Buffer | null = null;
    let duration = 0;

    if (isVideoUpload) {
      const effectiveStart = Number.isFinite(startTime) ? Math.max(0, startTime) : 0;
      const effectiveEnd = Number.isFinite(endTime) && endTime > effectiveStart ? endTime : undefined;
      processedBuffer = (await compressVideo(fileBuffer, {
        startTime: effectiveStart,
        endTime: effectiveEnd,
        maxWidth: 1280,
        maxHeight: 720,
      })) as Buffer;
      duration = Math.round(await getVideoDuration(processedBuffer));
      thumbnailBuffer = await extractVideoThumbnail(
        processedBuffer,
        Math.min(duration > 0 ? duration / 2 : 1, duration || 1)
      );
    } else if (isAudioUpload) {
      processedBuffer = await compressAudio(fileBuffer, { bitrate: "96k", format: "mp3" });
      duration = Math.max(1, Math.round(await getAudioDuration(processedBuffer)));
    } else {
      processedBuffer = keepOriginalQuality ? Buffer.from(fileBuffer) : await compressImage(fileBuffer);
      thumbnailBuffer = await generateThumbnail(fileBuffer);
    }

    const encryptedFile = encryptData(processedBuffer, user.encryptionKey) as Buffer;
    const savedFilePath = saveFile(
      encryptedFile,
      `${Date.now()}-${randomUUID()}-${file.name.replace(/[^a-zA-Z0-9_.-]/g, "_")}.enc`,
      userId
    );

    const memoryType = isVideoUpload ? "video" : isImageUpload ? "photo" : "voice";
    const savedThumbnailPath = thumbnailBuffer
      ? (() => {
          const encryptedThumbnail = encryptData(thumbnailBuffer, user.encryptionKey) as Buffer;
          return saveFile(
            encryptedThumbnail,
            `${Date.now()}-${randomUUID()}-${isVideoUpload ? "thumb.jpg" : "thumb.webp"}.enc`,
            userId
          );
        })()
      : null;

    const expiresAt = isStory ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null;

    const memory = await prisma.memory.create({
      data: {
        memoryType,
        encryptedContent: "",
        encryptedFilePath: savedFilePath,
        thumbnailPath: savedThumbnailPath,
        duration: isVideoUpload || isAudioUpload ? duration : undefined,
        title: file.name,
        description: caption || undefined,
        mood: ["happy","sad","excited","angry","anxious","grateful","neutral","tired","loved","hopeful","calm","nostalgic","reflective"].includes(normalizedMood ?? "") ? normalizedMood : null,
        memoryDate: new Date(),
        userId,
        isStory,
        expiresAt,
        status: "ready",
      } as any,
    });

    if (album && album.id) {
      await prisma.albumMemory.create({
        data: {
          albumId: album.id,
          memoryId: memory.id,
        },
      }).catch(() => undefined);

      emitToAlbum("new_memory", album.id, {
        albumId: album.id,
        memory,
      });
    }

    if (isStory) {
      const io = (globalThis as any).memoraaSocket;
      if (io) {
        io.emit("new_story", {
          story: memory,
          userId,
          expiresAt,
        });
      }
    }

    return NextResponse.json({ success: true, data: memory }, { status: 201 });
  } catch (error) {
    console.error("Error uploading media:", error);

    const message = error instanceof Error && error.message.includes("ffmpeg")
      ? "Video processing is unavailable right now. Please try again later."
      : "Failed to upload media";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
