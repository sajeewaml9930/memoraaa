import fs from "fs";
import os from "os";
import path from "path";
import ffmpeg from "fluent-ffmpeg";

function resolveStaticBinaryPath(packageName: string, executableName: string): string {
  const envVarName = packageName.includes("ffmpeg") ? "FFMPEG_PATH" : "FFPROBE_PATH";
  const envOverride = process.env[envVarName];
  if (envOverride && fs.existsSync(envOverride)) {
    return envOverride;
  }

  const candidates = [
    path.resolve(process.cwd(), "node_modules", packageName, "bin", process.platform, process.arch, process.platform === "win32" ? `${executableName}.exe` : executableName),
    path.resolve(process.cwd(), "node_modules", packageName, "bin", process.platform, process.arch.toString(), process.platform === "win32" ? `${executableName}.exe` : executableName),
    path.resolve(process.cwd(), "node_modules", packageName, process.platform === "win32" ? `${executableName}.exe` : executableName),
  ];

  const resolved = candidates.find((candidate) => fs.existsSync(candidate));
  if (resolved) {
    return resolved;
  }

  return executableName;
}

const ffmpegBinaryPath = resolveStaticBinaryPath("ffmpeg-static", "ffmpeg");
const ffprobeBinaryPath = resolveStaticBinaryPath("ffprobe-static", "ffprobe");

ffmpeg.setFfmpegPath(ffmpegBinaryPath);
ffmpeg.setFfprobePath(ffprobeBinaryPath);

function getTempFilePath(extension: string): string {
  return path.join(os.tmpdir(), `memoraa-audio-${Date.now()}-${Math.random().toString(16).slice(2)}${extension}`);
}

function formatSeconds(seconds: number): string {
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, Math.round(seconds)) : 0;
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
}

export async function getAudioDuration(inputBuffer: Buffer): Promise<number> {
  const inputPath = getTempFilePath(".input");

  try {
    fs.writeFileSync(inputPath, inputBuffer);

    return await new Promise<number>((resolve, reject) => {
      ffmpeg.ffprobe(inputPath, (error: Error | null, metadata: any) => {
        if (error) {
          reject(error);
          return;
        }

        const duration = Number(metadata?.format?.duration ?? metadata?.streams?.[0]?.duration ?? 0);
        resolve(Number.isFinite(duration) ? duration : 0);
      });
    });
  } finally {
    if (fs.existsSync(inputPath)) {
      fs.unlinkSync(inputPath);
    }
  }
}

export async function compressAudio(
  inputBuffer: Buffer,
  options?: {
    bitrate?: string;
    format?: "mp3" | "aac";
  }
): Promise<Buffer> {
  const inputPath = getTempFilePath(".input");
  const outputExtension = options?.format === "aac" ? ".aac" : ".mp3";
  const outputPath = getTempFilePath(outputExtension);

  try {
    fs.writeFileSync(inputPath, inputBuffer);

    await new Promise<void>((resolve, reject) => {
      const command = ffmpeg(inputPath)
        .audioCodec(options?.format === "aac" ? "aac" : "libmp3lame")
        .format(options?.format === "aac" ? "adts" : "mp3")
        .audioBitrate(options?.bitrate ?? "96k");

      command
        .on("error", (error: Error) => reject(error))
        .on("end", () => resolve())
        .save(outputPath);
    });

    return fs.readFileSync(outputPath);
  } finally {
    if (fs.existsSync(inputPath)) {
      fs.unlinkSync(inputPath);
    }

    if (fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath);
    }
  }
}

export function formatAudioDuration(seconds: number): string {
  return formatSeconds(seconds);
}
