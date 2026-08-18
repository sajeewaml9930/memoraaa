"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { X, Users } from "lucide-react";
import type { StoryItem } from "@/app/types";

interface StoryViewerProps {
  stories: StoryItem[];
  initialIndex: number;
  onClose: () => void;
}

export default function StoryViewer({ stories, initialIndex, onClose }: StoryViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [showViewers, setShowViewers] = useState(false);
  const [viewers, setViewers] = useState<any[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentStory = stories[currentIndex] ?? stories[0];

  useEffect(() => {
    setProgress(0);
    if (!currentStory) {
      return;
    }

    fetch(`/api/stories/${currentStory.id}/view`, { method: "POST" }).catch(() => undefined);

    if (currentStory.memoryType === "video") {
      setProgress(100);
      return;
    }

    intervalRef.current = setInterval(() => {
      setProgress((value) => {
        const next = Math.min(100, value + 2.5);
        if (next >= 100) {
          setCurrentIndex((index) => {
            const nextIndex = index + 1 < stories.length ? index + 1 : 0;
            return nextIndex;
          });
          return 0;
        }
        return next;
      });
    }, 150);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [currentStory, stories]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
      if (event.key === "ArrowRight") {
        setCurrentIndex((value) => (value + 1) % stories.length);
      }
      if (event.key === "ArrowLeft") {
        setCurrentIndex((value) => (value - 1 + stories.length) % stories.length);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [stories.length, onClose]);

  useEffect(() => {
    if (!currentStory) {
      return;
    }

    fetch(`/api/stories/${currentStory.id}/viewers`)
      .then((response) => response.json())
      .then((data) => setViewers(data.data || []))
      .catch(() => setViewers([]));
  }, [currentStory]);

  const mediaSource = useMemo(() => {
    if (!currentStory) {
      return "";
    }

    if (currentStory.memoryType === "photo" && currentStory.encryptedFilePath) {
      return `/api/media/${encodeURIComponent(currentStory.encryptedFilePath)}`;
    }

    if (currentStory.memoryType === "video" && currentStory.encryptedFilePath) {
      return `/api/media/${encodeURIComponent(currentStory.encryptedFilePath)}`;
    }

    if ((currentStory.memoryType === "voice" || currentStory.memoryType === "audio") && currentStory.encryptedFilePath) {
      return `/api/media/${encodeURIComponent(currentStory.encryptedFilePath)}`;
    }

    return "";
  }, [currentStory]);

  if (!currentStory) {
    return null;
  }

  const storyText = currentStory.storyContent ?? currentStory.description ?? "";

  return (
    <div className="fixed inset-0 z-50 bg-black/95 p-4 text-white" onClick={onClose}>
      <div className="mx-auto flex h-full max-w-3xl flex-col" onClick={(event) => event.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 overflow-hidden rounded-full bg-white/15">
              {currentStory.author?.avatar ? (
                <img src={currentStory.author.avatar} alt={currentStory.author.username} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm font-semibold" >{currentStory.author?.username?.slice(0, 1).toUpperCase() ?? "U"}</div>
              )}
            </div>
            <div>
              <p className="font-semibold">{currentStory.author?.fullName ?? currentStory.author?.username ?? "Unknown"}</p>
              <p className="text-xs text-gray-300">{new Date(currentStory.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowViewers((value) => !value)}
              className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-sm"
            >
              <Users size={14} />
              {currentStory.viewCount || viewers.length}
            </button>
            <button type="button" onClick={onClose} className="rounded-full bg-white/10 p-2" aria-label="Close story">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="mb-3 flex gap-2">
          {stories.map((story, index) => (
            <div key={story.id} className="h-1 flex-1 overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-white transition-all duration-150"
                style={{ width: index === currentIndex ? `${progress}%` : index < currentIndex ? "100%" : "0%" }}
              />
            </div>
          ))}
        </div>

        <div className="relative flex flex-1 items-center justify-center overflow-hidden rounded-3xl border border-white/10 bg-black/40">
          {currentStory.memoryType === "text" && (
            <div className="p-8 text-center text-2xl font-medium text-white">{storyText}</div>
          )}

          {currentStory.memoryType === "photo" && mediaSource && (
            <img src={mediaSource} alt="Story photo" className="h-full w-full object-cover" />
          )}

          {currentStory.memoryType === "video" && mediaSource && (
            <video src={mediaSource} className="h-full w-full object-cover" autoPlay muted playsInline />
          )}

          {(currentStory.memoryType === "voice" || currentStory.memoryType === "audio") && mediaSource && (
            <div className="flex h-full w-full items-center justify-center p-8">
              <audio src={mediaSource} controls autoPlay className="w-full max-w-md" />
            </div>
          )}
        </div>

        {showViewers && (
          <div className="mt-4 rounded-2xl bg-white/10 p-3 backdrop-blur-sm">
            <div className="mb-2 text-sm font-medium text-white">Seen by</div>
            {viewers.length === 0 ? (
              <p className="text-sm text-gray-300">No viewers yet.</p>
            ) : (
              <div className="space-y-2">
                {viewers.map((viewer) => (
                  <div key={`${viewer.id}-${viewer.viewedAt}`} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 overflow-hidden rounded-full bg-white/20">
                        {viewer.avatar ? (
                          <img src={viewer.avatar} alt={viewer.username} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs">{viewer.username?.slice(0, 1).toUpperCase() ?? "U"}</div>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{viewer.fullName ?? viewer.username}</p>
                        <p className="text-xs text-gray-300">{new Date(viewer.viewedAt).toLocaleString([], { hour: "numeric", minute: "2-digit", month: "short", day: "numeric" })}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
