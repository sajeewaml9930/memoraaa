"use client";

import { useEffect, useMemo, useRef, useState } from "react";

interface VideoTrimmerModalProps {
  file: File | null;
  isUploading?: boolean;
  uploadProgress?: number;
  onCancel: () => void;
  onConfirm: (payload: { startTime: number; endTime: number }) => Promise<void> | void;
}

export default function VideoTrimmerModal({
  file,
  isUploading = false,
  uploadProgress = 0,
  onCancel,
  onConfirm,
}: VideoTrimmerModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [duration, setDuration] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!file) {
      setPreviewUrl("");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !previewUrl) {
      return;
    }

    const handleLoadedMetadata = () => {
      const nextDuration = Number.isFinite(video.duration) ? video.duration : 0;
      setDuration(nextDuration);
      setStartTime(0);
      setEndTime(nextDuration || 0);
    };

    const handleTimeUpdate = () => {
      if (video.currentTime > endTime) {
        video.pause();
        video.currentTime = endTime;
      }
    };

    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("timeupdate", handleTimeUpdate);

    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("timeupdate", handleTimeUpdate);
    };
  }, [previewUrl, endTime]);

  const activeDuration = useMemo(() => Math.max(0, endTime - startTime), [startTime, endTime]);

  const handleRangeChange = (nextStart: number, nextEnd: number) => {
    const safeStart = Math.min(nextStart, duration);
    const safeEnd = Math.max(nextEnd, safeStart);
    setStartTime(Math.min(safeStart, safeEnd));
    setEndTime(Math.min(Math.max(safeEnd, safeStart), duration || safeEnd));
  };

  const handlePlayPreview = async () => {
    const video = videoRef.current;
    if (!video || !previewUrl) {
      return;
    }

    if (video.currentTime < startTime || video.currentTime > endTime) {
      video.currentTime = startTime;
    }

    try {
      await video.play();
      setIsPlaying(true);
    } catch {
      setIsPlaying(false);
    }
  };

  const handlePausePreview = () => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    video.pause();
    setIsPlaying(false);
  };

  const handleConfirm = async () => {
    if (!file) {
      return;
    }

    await onConfirm({ startTime, endTime });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onCancel}>
      <div
        className="w-full max-w-2xl rounded-2xl bg-white p-4 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800">Trim video</h3>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full px-2 py-1 text-sm text-gray-500 hover:bg-gray-100"
          >
            Cancel
          </button>
        </div>

        {previewUrl ? (
          <div className="mb-4 overflow-hidden rounded-xl border border-gray-200 bg-gray-100">
            <video
              ref={videoRef}
              src={previewUrl}
              controls={false}
              className="h-72 w-full bg-black object-contain"
              onEnded={() => setIsPlaying(false)}
            />
          </div>
        ) : (
          <div className="mb-4 flex h-72 items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 text-gray-400">
            No video selected
          </div>
        )}

        {duration > 0 && (
          <div className="mb-5 space-y-3">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>{startTime.toFixed(1)}s</span>
              <span>{endTime.toFixed(1)}s</span>
              <span>{activeDuration.toFixed(1)}s selected</span>
            </div>
            <input
              type="range"
              min={0}
              max={duration}
              step={0.1}
              value={startTime}
              onChange={(event) => handleRangeChange(Number(event.target.value), endTime)}
              className="w-full accent-blue-600"
            />
            <input
              type="range"
              min={0}
              max={duration}
              step={0.1}
              value={endTime}
              onChange={(event) => handleRangeChange(startTime, Number(event.target.value))}
              className="w-full accent-blue-600"
            />
          </div>
        )}

        <div className="mb-5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={isPlaying ? handlePausePreview : handlePlayPreview}
            className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
            disabled={!previewUrl}
          >
            {isPlaying ? "Pause" : "Preview selected clip"}
          </button>
          <span className="text-sm text-gray-500">
            {duration > 0 ? `${Math.max(0, endTime - startTime).toFixed(1)} sec clip` : "Loading..."}
          </span>
        </div>

        {isUploading && (
          <div className="mb-4">
            <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
              <span>Uploading video</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-blue-600 transition-all duration-200"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isUploading}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!file || isUploading || duration === 0}
            className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            {isUploading ? "Uploading..." : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}
