"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Search, Plus, MoreVertical, Pin, Image as ImageIcon } from "lucide-react";
import Link from "next/link";
import EditAlbumModal from "./EditAlbumModal";
import LockAlbumModal from "./LockAlbumModal";
import CopyAlbumModal from "./CopyAlbumModal";
import AlbumListControls, {
  type AlbumContentType,
  type AlbumOwnerFilter,
  type AlbumPrivacyFilter,
  type AlbumSortValue,
} from "./AlbumListControls";
import type { Album } from "@/app/types";

export default function ChatList() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [sortValue, setSortValue] = useState<AlbumSortValue>("date-desc");
  const [ownerFilter, setOwnerFilter] = useState<AlbumOwnerFilter>("all");
  const [privacyFilter, setPrivacyFilter] = useState<AlbumPrivacyFilter>("all");
  const [contentType, setContentType] = useState<AlbumContentType>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [showNewAlbum, setShowNewAlbum] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState("");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingAlbum, setEditingAlbum] = useState<Album | null>(null);
  const [isLockModalOpen, setIsLockModalOpen] = useState(false);
  const [lockingAlbum, setLockingAlbum] = useState<Album | null>(null);
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [copyingAlbum, setCopyingAlbum] = useState<Album | null>(null);
  const [contextMenuOpen, setContextMenuOpen] = useState<number | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  const fetchAlbums = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        sort: sortValue,
        filterOwner: ownerFilter,
        filterPrivate: privacyFilter,
        filterType: contentType,
      });

      const response = await fetch(`/api/albums?${params.toString()}`);
      const data = await response.json();
      setAlbums(data.data || []);
    } catch (error) {
      console.error("Error fetching albums:", error);
    } finally {
      setIsLoading(false);
    }
  }, [contentType, ownerFilter, privacyFilter, sortValue]);

  useEffect(() => {
    fetchAlbums();
  }, [fetchAlbums]);

  const handleCreateAlbum = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAlbumName.trim()) return;

    try {
      const response = await fetch("/api/albums", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newAlbumName, isPrivate: true }),
      });

      if (response.ok) {
        setNewAlbumName("");
        setShowNewAlbum(false);
        fetchAlbums();
      }
    } catch (error) {
      console.error("Error creating album:", error);
    }
  };

  const isAlbumActive = (albumId: number) => {
    return pathname === `/album/${albumId}`;
  };

  const handleEditAlbum = (album: Album, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setEditingAlbum(album);
    setIsEditModalOpen(true);
    setContextMenuOpen(null);
  };

  const handleArchiveAlbum = async (album: Album, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    const confirmed = window.confirm(
      `Archive "${album.name}"? It will be moved to the archive list and hidden from the main chat list.`
    );

    if (!confirmed) {
      setContextMenuOpen(null);
      return;
    }

    try {
      const response = await fetch(`/api/albums/${album.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isArchived: true }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.error || "Failed to archive album");
      }

      setAlbums((prevAlbums) => prevAlbums.filter((item) => item.id !== album.id));
      setContextMenuOpen(null);

      if (pathname === `/album/${album.id}`) {
        router.push("/archived");
      }
    } catch (error) {
      console.error("Error archiving album:", error);
      window.alert(
        error instanceof Error ? error.message : "Unable to archive album"
      );
    }
  };

  const handleDeleteAlbum = async (album: Album, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete "${album.name}"? This will hide the album and mark its unshared memories as archived.`
    );

    if (!confirmed) {
      setContextMenuOpen(null);
      return;
    }

    try {
      const response = await fetch(`/api/albums/${album.id}`, {
        method: "DELETE",
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.error || "Failed to delete album");
      }

      setAlbums((prevAlbums) => prevAlbums.filter((item) => item.id !== album.id));
      setContextMenuOpen(null);

      if (pathname === `/album/${album.id}`) {
        router.push("/");
      }
    } catch (error) {
      console.error("Error deleting album:", error);
      window.alert(
        error instanceof Error ? error.message : "Unable to delete album"
      );
    }
  };

  const handleTogglePin = async (album: Album, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    try {
      const response = await fetch(`/api/albums/${album.id}/pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinned: !album.isPinned }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.error || "Failed to update pin status");
      }

      await fetchAlbums();
      setContextMenuOpen(null);
    } catch (error) {
      console.error("Error toggling pin:", error);
      window.alert(
        error instanceof Error ? error.message : "Unable to update pin status"
      );
    }
  };

  const handleOpenLockModal = (album: Album, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    setLockingAlbum(album);
    setIsLockModalOpen(true);
    setContextMenuOpen(null);
  };

  const handleOpenCopyModal = (album: Album, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    setCopyingAlbum(album);
    setIsCopyModalOpen(true);
    setContextMenuOpen(null);
  };

  const handleToggleMute = async (album: Album, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    try {
      const response = await fetch(`/api/albums/${album.id}/mute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ muted: !album.isMuted }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || "Failed to update mute status");
      }

      setAlbums((prevAlbums) =>
        prevAlbums.map((item) =>
          item.id === album.id ? { ...item, isMuted: data?.data?.isMuted ?? !album.isMuted } : item
        )
      );
      setContextMenuOpen(null);
    } catch (error) {
      console.error("Error toggling mute:", error);
      window.alert(
        error instanceof Error ? error.message : "Unable to update mute status"
      );
    }
  };

  const handleLockUpdate = (updatedAlbum: Album) => {
    setAlbums((prevAlbums) =>
      prevAlbums.map((album) =>
        album.id === updatedAlbum.id ? { ...album, ...updatedAlbum } : album
      )
    );
  };

  const handleAlbumUpdate = (updatedAlbum: Album) => {
    setAlbums((prevAlbums) =>
      prevAlbums.map((album) =>
        album.id === updatedAlbum.id ? updatedAlbum : album
      )
    );
  };

  return (
    <div className="w-80 border-r border-gray-200 bg-white flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">Chats</h1>
          <button
            onClick={() => setShowNewAlbum(true)}
            className="rounded-full bg-blue-100 p-2 text-blue-600 hover:bg-blue-200"
            title="New album"
          >
            <Plus size={20} />
          </button>
        </div>

        <Link
          href="/search"
          className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          <Search size={16} />
          Search memories
        </Link>
      </div>

      {/* New Album Form */}
      {showNewAlbum && (
        <div className="border-b border-gray-200 p-4">
          <form onSubmit={handleCreateAlbum} className="space-y-2">
            <input
              type="text"
              placeholder="Album name..."
              value={newAlbumName}
              onChange={(e) => setNewAlbumName(e.target.value)}
              autoFocus
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => setShowNewAlbum(false)}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <AlbumListControls
        sortValue={sortValue}
        ownerFilter={ownerFilter}
        privacyFilter={privacyFilter}
        contentType={contentType}
        onSortChange={setSortValue}
        onOwnerFilterChange={setOwnerFilter}
        onPrivacyFilterChange={setPrivacyFilter}
        onContentTypeChange={setContentType}
      />

      {/* Albums List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <p className="text-gray-500">Loading albums...</p>
          </div>
        ) : albums.length === 0 ? (
          <div className="flex items-center justify-center p-8">
            <p className="text-center text-gray-500">
              No albums yet. Create one!
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {albums.map((album) => (
              <div
                key={album.id}
                className="relative"
                onMouseLeave={() => setContextMenuOpen(null)}
              >
                <Link
                  href={`/album/${album.id}`}
                  className={`block border-l-4 px-4 py-3 hover:bg-gray-50 transition ${
                    isAlbumActive(album.id)
                      ? "border-blue-600 bg-blue-50"
                      : "border-transparent"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-blue-100 to-indigo-200">
                        {album.coverPhoto ? (
                          <img
                            src={`/${album.coverPhoto.replace(/^\/+/, "")}`}
                            alt={album.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-gray-500">
                            <ImageIcon size={20} />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="truncate font-semibold text-gray-900">
                            {album.name}
                          </h3>
                          {album.isPinned && (
                            <Pin size={14} className="shrink-0 text-amber-500" />
                          )}
                          {album.isLocked && (
                            <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-600">
                              Locked
                            </span>
                          )}
                        </div>
                        {album.description && (
                          <p className="line-clamp-1 text-sm text-gray-600">
                            {album.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setContextMenuOpen(contextMenuOpen === album.id ? null : album.id);
                      }}
                      className="ml-2 p-1 rounded-lg text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition"
                      title="Album options"
                    >
                      <MoreVertical size={18} />
                    </button>
                  </div>
                </Link>

                {/* Context menu */}
                {contextMenuOpen === album.id && (
                  <div className="absolute right-0 top-full z-40 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                    <button
                      type="button"
                      onClick={(e) => handleEditAlbum(album, e)}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleTogglePin(album, e)}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      {album.isPinned ? "Unpin" : "Pin"}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleOpenLockModal(album, e)}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      {album.isLocked ? "Change Passcode" : "Lock Album"}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleToggleMute(album, e)}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      {album.isMuted ? "Unmute notifications" : "Mute notifications"}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleOpenCopyModal(album, e)}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Copy Album
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleArchiveAlbum(album, e)}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Archive
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteAlbum(album, e)}
                      className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Album Modal */}
      <EditAlbumModal
        isOpen={isEditModalOpen}
        album={editingAlbum}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingAlbum(null);
        }}
        onUpdate={handleAlbumUpdate}
      />

      <LockAlbumModal
        isOpen={isLockModalOpen}
        album={lockingAlbum}
        onClose={() => {
          setIsLockModalOpen(false);
          setLockingAlbum(null);
        }}
        onSuccess={handleLockUpdate}
      />

      <CopyAlbumModal
        album={copyingAlbum}
        isOpen={isCopyModalOpen}
        onClose={() => {
          setIsCopyModalOpen(false);
          setCopyingAlbum(null);
        }}
        onCopied={fetchAlbums}
      />
    </div>
  );
}
