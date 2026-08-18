"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import type { Memory } from "@/app/types";

interface ImageGalleryModalProps {
  memories: Memory[];
  initialIndex: number;
  onClose: () => void;
}

export default function ImageGalleryModal({
  memories,
  initialIndex,
  onClose,
}: ImageGalleryModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }

      if (event.key === "ArrowRight") {
        setCurrentIndex((value) => (value + 1) % memories.length);
      }

      if (event.key === "ArrowLeft") {
        setCurrentIndex((value) => (value - 1 + memories.length) % memories.length);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [memories.length, onClose]);

  const currentMemory = memories[currentIndex] ?? memories[0];

  const imageSrc = useMemo(() => {
    if (!currentMemory) {
      return "";
    }

    const filePath = currentMemory.encryptedFilePath || currentMemory.thumbnailPath || "";
    return filePath ? `/api/media/${encodeURIComponent(filePath)}` : "";
  }, [currentMemory]);

  if (!currentMemory || !imageSrc) {
    return null;
  }

  const goToPrevious = () => setCurrentIndex((value) => (value - 1 + memories.length) % memories.length);
  const goToNext = () => setCurrentIndex((value) => (value + 1) % memories.length);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
      onClick={onClose}
    >
      <div
        className="relative flex h-full w-full max-h-[90vh] max-w-5xl items-center justify-center rounded-2xl bg-black"
        onClick={(event) => event.stopPropagation()}
        onTouchStart={(event) => setTouchStartX(event.touches[0]?.clientX ?? null)}
        onTouchEnd={(event) => {
          if (touchStartX == null) {
            return;
          }

          const touchEndX = event.changedTouches[0]?.clientX ?? touchStartX;
          const delta = touchEndX - touchStartX;

          if (delta > 50) {
            goToPrevious();
          }

          if (delta < -50) {
            goToNext();
          }

          setTouchStartX(null);
        }}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-full bg-white/15 p-2 text-white backdrop-blur-sm hover:bg-white/25"
          aria-label="Close gallery"
        >
          <X size={20} />
        </button>

        <button
          type="button"
          onClick={goToPrevious}
          className="absolute left-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/15 p-2 text-white backdrop-blur-sm hover:bg-white/25"
          aria-label="Previous photo"
        >
          ←
        </button>

        <button
          type="button"
          onClick={goToNext}
          className="absolute right-12 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/15 p-2 text-white backdrop-blur-sm hover:bg-white/25"
          aria-label="Next photo"
        >
          →
        </button>

        <img
          src={imageSrc}
          alt="Memory gallery"
          className="max-h-[90vh] max-w-full object-contain"
        />

        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/40 px-3 py-1 text-sm text-white backdrop-blur-sm">
          {currentIndex + 1} / {memories.length}
        </div>
      </div>
    </div>
  );
}
