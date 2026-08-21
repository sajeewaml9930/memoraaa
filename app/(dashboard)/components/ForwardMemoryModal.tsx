"use client";

import { useEffect, useState } from "react";
import type { Album, Memory } from "@/app/types";

type Props = {
  memoryId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (memory: Memory) => void;
};

export default function ForwardMemoryModal({ memoryId, isOpen, onClose, onSuccess }: Props) {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [selectedAlbumId, setSelectedAlbumId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setIsLoading(true);
    fetch("/api/albums?permission=add")
      .then((res) => res.json())
      .then((data) => {
        setAlbums(data?.data ?? []);
      })
      .catch((err) => console.error("Failed to fetch albums for forward:", err))
      .finally(() => setIsLoading(false));
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setSelectedAlbumId(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!memoryId || !selectedAlbumId) return;
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/memories/${memoryId}/forward`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetAlbumId: selectedAlbumId }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Failed to forward memory");
      }

      const newMemory = data.data as Memory;
      onClose();
      onSuccess?.(newMemory);
      try {
        // simple feedback
        alert("Memory forwarded successfully");
      } catch {}
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Failed to forward memory");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative w-full max-w-md rounded-t-xl bg-white p-4 shadow-lg">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Forward memory</h3>
          <button onClick={onClose} className="text-sm text-gray-500">Cancel</button>
        </div>

        <p className="mb-3 text-sm text-gray-600">Select an album to forward this memory to. You can only forward to albums you can add to.</p>

        <div className="max-h-64 space-y-2 overflow-y-auto">
          {isLoading ? (
            <div className="text-sm text-gray-500">Loading albums...</div>
          ) : albums.length === 0 ? (
            <div className="text-sm text-gray-500">No albums available to forward to.</div>
          ) : (
            albums.map((album) => (
              <button
                key={album.id}
                type="button"
                onClick={() => setSelectedAlbumId(album.id)}
                className={`flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left transition ${selectedAlbumId === album.id ? "border-blue-600 bg-blue-50" : "border-gray-200 hover:bg-gray-50"}`}
              >
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-gray-100">
                  {album.coverPhoto ? (
                    <img src={`/api/album/cover/${album.id}`} alt={album.name} className="h-full w-full object-cover"/>
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-gray-500">No cover</div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-800">{album.name}</div>
                  <div className="text-xs text-gray-500">{album.memoryCount} memories • {album.role === "owner" ? "Owner" : "Collaborator"}</div>
                </div>
                <div className="text-sm text-gray-500">{selectedAlbumId === album.id ? "Selected" : ""}</div>
              </button>
            ))
          )}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md border px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={!selectedAlbumId || isSubmitting}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {isSubmitting ? "Forwarding..." : "Forward"}
          </button>
        </div>
      </div>
    </div>
  );
}
