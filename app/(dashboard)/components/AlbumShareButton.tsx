"use client";

import { Share2 } from "lucide-react";
import { useState } from "react";
import ShareAlbumModal from "./ShareAlbumModal";
import type { Album } from "@/app/types";

interface AlbumShareButtonProps {
  album: Album | null;
}

export default function AlbumShareButton({ album }: AlbumShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!album) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        <Share2 size={16} />
        Share
      </button>

      <ShareAlbumModal isOpen={isOpen} album={album} onClose={() => setIsOpen(false)} />
    </>
  );
}
