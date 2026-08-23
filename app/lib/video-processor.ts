import fs from "fs";
import os from "os";
import path from "path";
import ffmpeg from "fluent-ffmpeg";

function resolveStaticBinaryPath(
  packageName: string,
  executableName: string,
): string {
  const envVarName = packageName.includes("ffmpeg")
    ? "FFMPEG_PATH"
    : "FFPROBE_PATH";
  const envOverride = process.env[envVarName];
  if (envOverride && fs.existsSync(envOverride)) {
    return envOverride;
  }

  const candidates = [
    path.resolve(
      process.cwd(),
      "node_modules",
      packageName,
      "bin",
      process.platform,
      process.arch,
      process.platform === "win32" ? `${executableName}.exe` : executableName,
    ),
    path.resolve(
      process.cwd(),
      "node_modules",
      packageName,
      "bin",
      process.platform,
      process.arch.toString(),
      process.platform === "win32" ? `${executableName}.exe` : executableName,
    ),
    path.resolve(
      process.cwd(),
      "node_modules",
      packageName,
      process.platform === "win32" ? `${executableName}.exe` : executableName,
    ),
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
  return path.join(
    os.tmpdir(),
    `memoraa-video-${Date.now()}-${Math.random().toString(16).slice(2)}${extension}`,
  );
}

function formatSeconds(seconds: number): string {
  const safeSeconds = Number.isFinite(seconds)
    ? Math.max(0, Math.round(seconds))
    : 0;
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
}

export async function getVideoDuration(inputBuffer: Buffer): Promise<number> {
  const inputPath = getTempFilePath(".input.mp4");

  try {
    fs.writeFileSync(inputPath, inputBuffer);

    return await new Promise<number>((resolve, reject) => {
      ffmpeg.ffprobe(inputPath, (error: Error | null, metadata: any) => {
        if (error) {
          reject(error);
          return;
        }

        const duration = Number(
          metadata?.format?.duration ?? metadata?.streams?.[0]?.duration ?? 0,
        );
        resolve(Number.isFinite(duration) ? duration : 0);
      });
    });
  } finally {
    if (fs.existsSync(inputPath)) {
      fs.unlinkSync(inputPath);
    }
  }
}

export async function compressVideo(
  inputBuffer: Buffer,
  options?: {
    startTime?: number;
    endTime?: number;
    maxWidth?: number;
    maxHeight?: number;
    bitrate?: string;
  },
): Promise<Buffer> {
  const inputPath = getTempFilePath(".input.mp4");
  const outputPath = getTempFilePath(".output.mp4");

  try {
    fs.writeFileSync(inputPath, inputBuffer);

    const duration = await getVideoDuration(inputBuffer);
    const trimmedStart = Math.max(0, Number(options?.startTime ?? 0));
    const trimmedEnd = Number.isFinite(options?.endTime)
      ? Number(options?.endTime)
      : duration;
    const effectiveDuration = Math.max(0, trimmedEnd - trimmedStart);

    await new Promise<void>((resolve, reject) => {
      const command = ffmpeg(inputPath)
        .seekInput(trimmedStart)
        .videoCodec("libx264")
        .audioCodec("aac")
        .format("mp4")
        .outputOptions([
          "-preset slow",
          "-crf 18",
          "-pix_fmt yuv420p",
          "-max_muxing_queue_size 9999",
        ]);

      if (options?.bitrate) {
        command.outputOptions([`-b:v ${options.bitrate}`]);
      }

      if (options?.maxWidth || options?.maxHeight) {
        command.size(
          `${options?.maxWidth ?? 1280}x${options?.maxHeight ?? 720}`,
        );
      }

      if (effectiveDuration > 0) {
        command.duration(
          Math.min(effectiveDuration, duration || effectiveDuration),
        );
      }

      command
        .on("error", (error: Error) => reject(error))
        .on("end", () => resolve())
        .save(outputPath);
    });

    const outputBuffer = fs.readFileSync(outputPath);
    return outputBuffer;
  } finally {
    if (fs.existsSync(inputPath)) {
      fs.unlinkSync(inputPath);
    }

    if (fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath);
    }
  }
}

export async function extractVideoThumbnail(
  inputBuffer: Buffer,
  timeSeconds?: number,
): Promise<Buffer> {
  const inputPath = getTempFilePath(".input.mp4");
  const outputPath = getTempFilePath(".thumb.jpg");

  try {
    fs.writeFileSync(inputPath, inputBuffer);
    const duration = await getVideoDuration(inputBuffer);
    const targetTime =
      Number.isFinite(timeSeconds) && timeSeconds !== undefined
        ? Math.min(Math.max(0, timeSeconds), Math.max(0, duration || 0))
        : Math.min(
            Math.max(duration > 0 ? duration * 0.1 : 1, 1),
            duration || 1,
          );

    await new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .seekInput(targetTime)
        .outputOptions(["-frames:v 1", "-q:v 2"])
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

export function formatVideoDuration(seconds: number): string {
  return formatSeconds(seconds);
}
