"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useParams, useSearchParams } from "next/navigation";
import ChatList from "../../components/ChatList";
import LockAlbumModal from "../../components/LockAlbumModal";
import MemoryStream from "../../components/MemoryStream";
import AlbumInfoDrawer from "../../components/AlbumInfoDrawer";
import { useAlbumLock } from "../../hooks/useAlbumLock";
import type { Album } from "@/app/types";

export default function AlbumDetailPage() {
  const { id } = useParams();
  const albumId = id ? Number(id) : null;
  const { isUnlocked, unlockAlbum } = useAlbumLock();
  const searchParams = useSearchParams();
  const [album, setAlbum] = useState<Album | null>(null);
  const [sessionUserId, setSessionUserId] = useState<number | null>(null);
  const [isLockedModalOpen, setIsLockedModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isInfoDrawerOpen, setIsInfoDrawerOpen] = useState(false);

  useEffect(() => {
    if (searchParams.get("info") === "1") {
      setIsInfoDrawerOpen(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!albumId) {
      return;
    }

    const loadSession = async () => {
      try {
        const sessionResponse = await fetch("/api/auth/session");
        const sessionData = await sessionResponse.json();
        const nextUserId = sessionData?.user?.id ? Number(sessionData.user.id) : null;
        setSessionUserId(Number.isFinite(nextUserId) ? nextUserId : null);
      } catch {
        setSessionUserId(null);
      }
    };

    const fetchAlbum = async () => {
      try {
        const response = await fetch(`/api/albums/${albumId}`);
        const data = await response.json();
        const nextAlbum = data?.data ?? null;
        setAlbum(nextAlbum);

        if (nextAlbum?.isLocked) {
          const isOwner = sessionUserId !== null && Number(sessionUserId) === Number(nextAlbum.userId);
          if (!isOwner && !isUnlocked(albumId, nextAlbum?.passcodeTimeout ?? 5)) {
            setIsLockedModalOpen(true);
          }
        }
      } catch (error) {
        console.error("Error fetching album:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSession();
    fetchAlbum();
  }, [albumId, isUnlocked, sessionUserId]);

  const handleUnlock = async (passcode: string) => {
    if (!albumId || !album) {
      return;
    }

    try {
      const response = await fetch(`/api/albums/${albumId}/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error || "Incorrect passcode");
      }

      const data = await response.json();
      unlockAlbum(albumId, Number(data?.timeoutMinutes ?? album.passcodeTimeout ?? 5));
      setIsLockedModalOpen(false);
    } catch (error) {
      console.error("Error unlocking album:", error);
      window.alert(
        error instanceof Error ? error.message : "Unable to unlock album"
      );
    }
  };

  if (!albumId) {
    return null;
  }

  const isOwner = !!album && sessionUserId !== null && Number(album.userId) === Number(sessionUserId);
  const isAlbumUnlocked = !album?.isLocked || isOwner || isUnlocked(albumId, album?.passcodeTimeout ?? 5);

  return (
    <>
      <ChatList />
      <div className="flex min-w-0 flex-1 flex-col pb-0">
        <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 md:px-6 md:py-4">
          <div className="flex items-center gap-3">
            <Link
              href="/albums"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100 md:hidden"
              title="Back to chats"
              aria-label="Back to chats"
            >
              <ArrowLeft size={20} />
            </Link>
            <button
              type="button"
              className="flex min-w-0 items-center gap-3 rounded-xl p-1 text-left hover:bg-gray-50"
              onClick={() => setIsInfoDrawerOpen(true)}
              aria-label="Open album info"
            >
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-linear-to-br from-blue-100 to-indigo-200">
                {album?.coverPhoto ? (
                  <img
                    src={`/api/album/cover/${album.id}`}
                    alt={album.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-gray-500">
                    <span className="text-lg font-semibold">{album?.name?.charAt(0)?.toUpperCase() ?? "A"}</span>
                  </div>
                )}
              </div>
              <span className="truncate text-lg font-semibold text-gray-900">{album?.name ?? "Album"}</span>
            </button>
          </div>
        </div>
        {isLoading ? (
        <div className="flex flex-1 items-center justify-center bg-gray-50">
          <p className="text-gray-500">Loading album...</p>
        </div>
      ) : album?.isLocked && !isAlbumUnlocked ? (
        <div className="flex flex-1 items-center justify-center bg-gray-50 p-6">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-3 text-xl font-semibold text-gray-900">This album is locked</h2>
            <p className="mb-4 text-sm text-gray-600">
              Enter the passcode to view this album.
            </p>
            <input
              type="password"
              placeholder="Enter passcode"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyDown={async (event) => {
                if (event.key === "Enter") {
                  const value = (event.target as HTMLInputElement).value;
                  await handleUnlock(value);
                }
              }}
            />
            <button
              type="button"
              className="mt-4 w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              onClick={async () => {
                const input = document.querySelector<HTMLInputElement>("input[placeholder='Enter passcode']");
                if (input) {
                  await handleUnlock(input.value);
                }
              }}
            >
              Unlock
            </button>
          </div>
        </div>
      ) : (
        <MemoryStream onAlbumHeaderClick={() => setIsInfoDrawerOpen(true)} />
      )}
      </div>

      <LockAlbumModal
        isOpen={isLockedModalOpen}
        album={album}
        onClose={() => setIsLockedModalOpen(false)}
        onSuccess={(updatedAlbum) => {
          setAlbum(updatedAlbum);
          if (albumId) {
            unlockAlbum(albumId, updatedAlbum.passcodeTimeout ?? 5);
          }
        }}
      />
      <AlbumInfoDrawer
        album={album}
        isOpen={isInfoDrawerOpen}
        onClose={() => setIsInfoDrawerOpen(false)}
        onOpenChange={setIsInfoDrawerOpen}
        onAlbumUpdated={setAlbum}
        onPasscodeLock={() => setIsLockedModalOpen(true)}
      />
    </>
  );
}
