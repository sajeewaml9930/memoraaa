"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, ArchiveRestore, FolderArchive } from "lucide-react";
import type { Album } from "@/app/types";

export default function ArchivedPage() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchArchivedAlbums = async () => {
    try {
      const response = await fetch("/api/albums?archived=true");
      const data = await response.json();
      setAlbums(data.data || []);
    } catch (error) {
      console.error("Error fetching archived albums:", error);
      setAlbums([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchArchivedAlbums();
  }, []);

  const handleRestore = async (albumId: number) => {
    try {
      const response = await fetch(`/api/albums/${albumId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isArchived: false }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to restore album");
      }

      setAlbums((currentAlbums) =>
        currentAlbums.filter((album) => album.id !== albumId)
      );
    } catch (error) {
      console.error("Error restoring album:", error);
      window.alert(
        error instanceof Error ? error.message : "Unable to restore album"
      );
    }
  };

  return (
    <div className="flex flex-1 flex-col bg-gray-50">
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center gap-3">
          <Link
            href="/chats"
            className="flex h-9 w-9 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100"
            title="Back to chats"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="flex items-center gap-2">
            <FolderArchive size={20} className="text-gray-700" />
            <h1 className="text-xl font-semibold text-gray-900">Archived Albums</h1>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-gray-500">
            Loading archived albums...
          </div>
        ) : albums.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <ArchiveRestore size={40} className="mb-3 text-gray-400" />
            <p className="text-lg font-medium text-gray-700">No archived albums</p>
            <p className="mt-1 text-sm text-gray-500">
              Archived albums will appear here for easy restoration.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {albums.map((album) => (
              <div
                key={album.id}
                className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-semibold text-gray-900">
                    {album.name}
                  </p>
                  {album.description && (
                    <p className="mt-1 line-clamp-1 text-sm text-gray-600">
                      {album.description}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-gray-500">
                    Archived {new Date(album.updatedAt).toLocaleDateString()}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleRestore(album.id)}
                  className="ml-4 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Restore
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
