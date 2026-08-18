"use client";

import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "memoraa_unlocked_albums";

interface UnlockState {
  expiresAt: number;
  timeoutMinutes: number;
}

export function useAlbumLock() {
  const [unlockedAlbums, setUnlockedAlbums] = useState<Record<number, UnlockState>>({});

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return;
      }

      const parsed = JSON.parse(raw) as Record<number, UnlockState>;
      const now = Date.now();

      const validState = Object.fromEntries(
        Object.entries(parsed).filter(([, value]) => (value?.expiresAt ?? 0) > now)
      );

      setUnlockedAlbums(validState);
      if (Object.keys(validState).length !== Object.keys(parsed).length) {
        window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(validState));
      }
    } catch (error) {
      console.error("Error loading unlock state:", error);
    }
  }, []);

  useEffect(() => {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(unlockedAlbums));
    } catch (error) {
      console.error("Error saving unlock state:", error);
    }
  }, [unlockedAlbums]);

  const isUnlocked = (albumId: number, timeoutMinutes = 5) => {
    const unlock = unlockedAlbums[albumId];
    if (!unlock) {
      return false;
    }

    const isValid = unlock.expiresAt > Date.now();
    if (!isValid) {
      setUnlockedAlbums((current) => {
        const next = { ...current };
        delete next[albumId];
        return next;
      });
      return false;
    }

    if (unlock.timeoutMinutes !== timeoutMinutes) {
      return false;
    }

    return true;
  };

  const unlockAlbum = (albumId: number, timeoutMinutes: number) => {
    const expiresAt = Date.now() + (timeoutMinutes > 0 ? timeoutMinutes * 60 * 1000 : 0);
    setUnlockedAlbums((current) => ({
      ...current,
      [albumId]: {
        expiresAt: timeoutMinutes > 0 ? expiresAt : Date.now() + 60 * 60 * 1000,
        timeoutMinutes,
      },
    }));
  };

  const clearAlbumUnlock = (albumId: number) => {
    setUnlockedAlbums((current) => {
      const next = { ...current };
      delete next[albumId];
      return next;
    });
  };

  return useMemo(
    () => ({
      unlockedAlbums,
      isUnlocked,
      unlockAlbum,
      clearAlbumUnlock,
    }),
    [unlockedAlbums]
  );
}
