"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { Album } from "@/app/types";

interface CopyAlbumModalProps {
  album: Album | null;
  isOpen: boolean;
  onClose: () => void;
  onCopied: () => void;
}

export default function CopyAlbumModal({
  album,
  isOpen,
  onClose,
  onCopied,
}: CopyAlbumModalProps) {
  const [newName, setNewName] = useState("");
  const [includeMemories, setIncludeMemories] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && album) {
      setNewName(`Copy of ${album.name}`);
      setIncludeMemories(true);
      setError(null);
    }
  }, [isOpen, album]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!album) return;

    const trimmedName = newName.trim();
    if (!trimmedName) {
      setError("Album name is required");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/albums/${album.id}/copy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          includeMemories,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.error || "Failed to copy album");
      }

      onCopied();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to copy album");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !album) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Copy album</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            aria-label="Close copy modal"
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Album name
            </label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              maxLength={100}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              placeholder="Enter copied album name"
            />
          </div>

          <label className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
            <div>
              <p className="text-sm font-medium text-gray-800">Include memories</p>
              <p className="text-xs text-gray-500">Duplicate the album contents and memory records.</p>
            </div>
            <input
              type="checkbox"
              checked={includeMemories}
              onChange={(e) => setIncludeMemories(e.target.checked)}
              className="h-5 w-5"
            />
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
            >
              {isSubmitting ? "Copying..." : "Copy album"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
