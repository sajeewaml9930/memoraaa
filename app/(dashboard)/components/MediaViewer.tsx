"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Maximize,
  Minimize,
  Pause,
  PlayCircle,
  Volume2,
  VolumeX,
  Download,
  Forward,
  MessageCircle,
  Pin,
  Reply,
  Smile,
  Star,
  X,
} from "lucide-react";
import type { Memory } from "@/app/types";
import { useMediaCache } from "@/app/hooks/useMediaCache";

interface MediaViewerProps {
  isOpen: boolean;
  initialMediaIndex: number;
  albumId: number;
  media: Memory[];
  onClose: () => void;
  onGoToMessage: (memoryId: number) => void;
  onReply?: (memory: Memory) => void;
  onToggleFavorite: (memoryId: number, currentValue: boolean) => void;
  onTogglePin: (memoryId: number, currentValue: boolean) => void;
  onReact: (memoryId: number, emoji: string) => void;
  onForward: (memoryId: number) => void;
}

const reactions = ["❤️", "😂", "😮", "😢", "🙏"];

function mediaUrl(path?: string) {
  return path ? `/api/media/${encodeURIComponent(path)}` : "";
}

function formatTimestamp(value: Date | string) {
  const date = new Date(value);
  return `${date.toLocaleDateString([], { month: "short", day: "numeric" })} at ${date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
}

function formatDuration(duration?: number) {
  if (!duration || duration < 1) return "0:00";
  const seconds = Math.floor(duration);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function formatTime(seconds: number) {
  return formatDuration(seconds);
}

function CustomVideoPlayer({
  src,
  poster,
  durationHint,
  videoRef,
  onLoadedMetadata,
}: {
  src: string;
  poster?: string;
  durationHint?: number;
  videoRef: RefObject<HTMLVideoElement | null>;
  onLoadedMetadata: () => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(durationHint ?? 0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const isSeekingRef = useRef(false);

  useEffect(() => {
    if (!isPlaying) {
      setControlsVisible(true);
      return;
    }

    const hideTimer = window.setTimeout(() => setControlsVisible(false), 3000);
    return () => window.clearTimeout(hideTimer);
  }, [controlsVisible, isPlaying]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === containerRef.current);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const showControls = () => setControlsVisible(true);
  const togglePlayback = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      void videoRef.current.play().catch(() => {
        setIsPlaying(false);
      });
    } else {
      videoRef.current.pause();
    }
    showControls();
  };
  const seek = (value: number) => {
    if (!videoRef.current) return;
    const nextTime = Math.max(0, Math.min(value, progressMax || value));
    videoRef.current.currentTime = nextTime;
    setCurrentTime(nextTime);
    showControls();
  };
  const toggleMute = () => {
    if (!videoRef.current) return;
    const nextMuted = !videoRef.current.muted;
    videoRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
    showControls();
  };
  const changeVolume = (value: number) => {
    if (!videoRef.current) return;
    videoRef.current.volume = value;
    videoRef.current.muted = value === 0;
    setVolume(value);
    setIsMuted(value === 0);
    showControls();
  };
  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await containerRef.current.requestFullscreen();
    }
  };

  const progressMax = duration > 0 ? duration : (durationHint ?? 0);
  const progressPercent =
    progressMax > 0 ? (currentTime / progressMax) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className="group relative flex h-full w-full max-h-full max-w-full items-center justify-center overflow-hidden bg-black"
      onMouseMove={showControls}
      onMouseLeave={() => isPlaying && setControlsVisible(false)}
      onTouchStart={showControls}
      onClick={(event) => event.stopPropagation()}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster || undefined}
        preload="metadata"
        className="max-h-[calc(100vh-190px)] max-w-full object-contain"
        onClick={togglePlayback}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={(event) => {
          if (!isSeekingRef.current) {
            setCurrentTime(event.currentTarget.currentTime);
          }
        }}
        onLoadedMetadata={(event) => {
          setDuration(event.currentTarget.duration || durationHint || 0);
          onLoadedMetadata();
        }}
        onEnded={() => setIsPlaying(false)}
      />
      <button
        type="button"
        onClick={togglePlayback}
        className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/60 p-4 text-white shadow-lg transition-opacity hover:bg-black/80 ${isPlaying ? "pointer-events-none opacity-0" : "opacity-100"}`}
        aria-label={isPlaying ? "Pause video" : "Play video"}
        title={isPlaying ? "Pause" : "Play"}
      >
        {isPlaying ? <Pause size={42} /> : <PlayCircle size={42} />}
      </button>
      <div
        className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/55 to-transparent px-3 pb-3 pt-10 transition-opacity ${controlsVisible ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={(event) => event.stopPropagation()}
      >
        <input
          type="range"
          min="0"
          max={progressMax || 1}
          step="0.01"
          value={Math.min(currentTime, progressMax || 1)}
          onInput={(event) => seek(Number(event.currentTarget.value))}
          onChange={(event) => seek(Number(event.currentTarget.value))}
          onPointerDown={() => {
            isSeekingRef.current = true;
            showControls();
          }}
          onPointerUp={() => {
            isSeekingRef.current = false;
            showControls();
          }}
          onPointerCancel={() => {
            isSeekingRef.current = false;
          }}
          className="pointer-events-auto mb-2 h-1 w-full cursor-pointer appearance-none rounded-full accent-[#25D366]"
          style={{
            background: `linear-gradient(to right, #25D366 ${progressPercent}%, rgba(255,255,255,.35) ${progressPercent}%)`,
          }}
          aria-label="Video progress"
        />
        <div className="flex items-center gap-2 text-xs text-white drop-shadow">
          <button
            type="button"
            onClick={togglePlayback}
            className="rounded-full p-1 hover:bg-white/15"
            aria-label={isPlaying ? "Pause video" : "Play video"}
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <Pause size={17} /> : <PlayCircle size={17} />}
          </button>
          <span className="tabular-nums">
            {formatTime(currentTime)} / {formatTime(progressMax)}
          </span>
          <button
            type="button"
            onClick={toggleMute}
            className="ml-auto rounded-full p-1 hover:bg-white/15"
            aria-label={isMuted ? "Unmute video" : "Mute video"}
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <VolumeX size={17} /> : <Volume2 size={17} />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={isMuted ? 0 : volume}
            onChange={(event) => changeVolume(Number(event.target.value))}
            className="hidden w-16 accent-white sm:block"
            aria-label="Video volume"
          />
          <button
            type="button"
            onClick={() => void toggleFullscreen()}
            className="rounded-full p-1 hover:bg-white/15"
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize size={17} /> : <Maximize size={17} />}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MediaViewer({
  isOpen,
  initialMediaIndex,
  albumId,
  media,
  onClose,
  onGoToMessage,
  onReply,
  onToggleFavorite,
  onTogglePin,
  onReact,
  onForward,
}: MediaViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(() =>
    Math.min(initialMediaIndex, Math.max(0, media.length - 1)),
  );
  const [showReactions, setShowReactions] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaCache = useMediaCache();

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") goTo(currentIndex - 1);
      if (event.key === "ArrowRight") goTo(currentIndex + 1);
      if (event.key === " " && media[currentIndex]?.memoryType === "video") {
        event.preventDefault();
        void toggleVideo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  });

  const currentMemory = media[currentIndex];
  const imageSrc = useMemo(
    () =>
      mediaUrl(
        currentMemory?.encryptedFilePath || currentMemory?.thumbnailPath,
      ),
    [currentMemory],
  );
  const posterSrc = mediaUrl(currentMemory?.thumbnailPath);
  const senderName =
    currentMemory?.sender?.fullName ||
    currentMemory?.sender?.username ||
    "Unknown user";

  if (!isOpen || !currentMemory) return null;

  const isVideo = currentMemory.memoryType === "video";
  const canGoPrevious = currentIndex > 0;
  const canGoNext = currentIndex < media.length - 1;

  async function toggleVideo() {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      try {
        await videoRef.current.play();
      } catch {
        setIsPlaying(false);
      }
    } else {
      videoRef.current.pause();
    }
  }

  async function downloadMedia() {
    const path = currentMemory.encryptedFilePath;
    if (!path) return;
    const response = await fetch(mediaUrl(path));
    if (!response.ok) return;
    const blobUrl = URL.createObjectURL(await response.blob());
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = `memoraa-${currentMemory.id}.${isVideo ? "mp4" : "jpg"}`;
    link.click();
    URL.revokeObjectURL(blobUrl);
  }

  const goTo = (index: number) => {
    videoRef.current?.pause();
    setIsPlaying(false);
    setCurrentIndex(Math.max(0, Math.min(media.length - 1, index)));
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col bg-black/95 text-white"
      role="dialog"
      aria-modal="true"
      aria-label="Media viewer"
      onTouchStart={(event) =>
        setTouchStartX(event.touches[0]?.clientX ?? null)
      }
      onTouchEnd={(event) => {
        if (touchStartX == null) return;
        const delta =
          (event.changedTouches[0]?.clientX ?? touchStartX) - touchStartX;
        if (delta > 50 && canGoPrevious) goTo(currentIndex - 1);
        if (delta < -50 && canGoNext) goTo(currentIndex + 1);
        setTouchStartX(null);
      }}
    >
      <header className="flex shrink-0 items-center gap-3 border-b border-white/10 bg-black/40 px-4 py-3 backdrop-blur-md">
        <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/20 text-sm font-semibold">
          {currentMemory.sender?.avatar ? (
            <img
              src={`${currentMemory.sender.avatar}?albumId=${albumId}`}
              alt=""
              className="size-full object-cover"
            />
          ) : (
            senderName.charAt(0).toUpperCase()
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{senderName}</p>
          <p className="text-xs text-white/60">
            {formatTimestamp(currentMemory.createdAt)}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="ml-auto rounded-full p-2 text-white/70 hover:bg-white/10 hover:text-white"
          aria-label="Close viewer"
          title="Close"
        >
          <X size={21} />
        </button>
      </header>

      <main className="relative flex min-h-0 flex-1 items-center justify-center px-12 py-5">
        <button
          type="button"
          onClick={() => goTo(currentIndex - 1)}
          disabled={!canGoPrevious}
          className="absolute left-3 z-10 rounded-full bg-white/10 p-3 text-white transition hover:bg-white/20 disabled:invisible"
          aria-label="Previous media"
          title="Previous"
        >
          <ChevronLeft size={28} />
        </button>
        {isVideo ? (
          <CustomVideoPlayer
            key={currentMemory.id}
            src={mediaUrl(currentMemory.encryptedFilePath)}
            poster={posterSrc}
            durationHint={currentMemory.duration}
            videoRef={videoRef}
            onLoadedMetadata={() =>
              posterSrc && void mediaCache.cacheThumbnail(posterSrc)
            }
          />
        ) : (
          <img
            src={imageSrc}
            alt={currentMemory.description || "Memory"}
            onLoad={() => void mediaCache.cacheMedia(imageSrc)}
            className="max-h-[calc(100vh-190px)] max-w-full object-contain"
          />
        )}
        <button
          type="button"
          onClick={() => goTo(currentIndex + 1)}
          disabled={!canGoNext}
          className="absolute right-3 z-10 rounded-full bg-white/10 p-3 text-white transition hover:bg-white/20 disabled:invisible"
          aria-label="Next media"
          title="Next"
        >
          <ChevronRight size={28} />
        </button>
      </main>

      <footer className="relative flex shrink-0 items-center justify-center gap-1 border-t border-white/10 bg-black/50 px-3 py-3 backdrop-blur-md">
        <button
          type="button"
          onClick={() => {
            onClose();
            onGoToMessage(currentMemory.id);
          }}
          className="rounded-full p-2.5 text-white/75 hover:bg-white/10 hover:text-white"
          aria-label="Go to message"
          title="Go to message"
        >
          <MessageCircle size={19} />
        </button>
        <button
          type="button"
          onClick={() => onReply?.(currentMemory)}
          disabled={!onReply}
          className="rounded-full p-2.5 text-white/75 hover:bg-white/10 hover:text-white disabled:opacity-40"
          aria-label="Reply"
          title="Reply"
        >
          <Reply size={19} />
        </button>
        <button
          type="button"
          onClick={() =>
            onToggleFavorite(currentMemory.id, currentMemory.isFavorite)
          }
          className={`rounded-full p-2.5 hover:bg-white/10 ${currentMemory.isFavorite ? "text-yellow-300" : "text-white/75 hover:text-white"}`}
          aria-label="Star"
          title="Star"
        >
          <Star
            size={19}
            className={currentMemory.isFavorite ? "fill-current" : ""}
          />
        </button>
        <button
          type="button"
          onClick={() => onTogglePin(currentMemory.id, currentMemory.isPinned)}
          className={`rounded-full p-2.5 hover:bg-white/10 ${currentMemory.isPinned ? "text-yellow-300" : "text-white/75 hover:text-white"}`}
          aria-label="Pin"
          title="Pin"
        >
          <Pin
            size={19}
            className={currentMemory.isPinned ? "fill-current" : ""}
          />
        </button>
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowReactions((visible) => !visible)}
            className="rounded-full p-2.5 text-white/75 hover:bg-white/10 hover:text-white"
            aria-label="React"
            title="React"
          >
            <Smile size={19} />
          </button>
          {showReactions && (
            <div className="absolute bottom-12 left-1/2 flex -translate-x-1/2 gap-1 rounded-full bg-white px-2 py-1 shadow-xl">
              {reactions.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    onReact(currentMemory.id, emoji);
                    setShowReactions(false);
                  }}
                  className="rounded-full p-1.5 text-lg hover:bg-gray-100"
                  aria-label={`React ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => onForward(currentMemory.id)}
          className="rounded-full p-2.5 text-white/75 hover:bg-white/10 hover:text-white"
          aria-label="Forward"
          title="Forward"
        >
          <Forward size={19} />
        </button>
        <button
          type="button"
          onClick={() => void downloadMedia()}
          className="rounded-full p-2.5 text-white/75 hover:bg-white/10 hover:text-white"
          aria-label="Download"
          title="Download"
        >
          <Download size={19} />
        </button>
        <span className="ml-3 text-xs text-white/50">
          {currentIndex + 1} / {media.length}
        </span>
      </footer>
    </div>
  );
}
