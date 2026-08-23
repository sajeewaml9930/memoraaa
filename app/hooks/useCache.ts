"use client";

import { useCallback, useEffect, useMemo } from "react";
import {
  clearCache,
  getAlbum,
  getCollaborators,
  getMessages,
  getAlbums,
  initializeCache,
  invalidateCache,
  saveAlbum,
  saveAlbums,
  saveCollaborators,
  saveMessage,
  saveMessages,
  replaceMessages,
  removeMessage,
  saveUsers,
  MAX_MESSAGES_PER_ALBUM,
} from "@/app/lib/cache";

export function useCache() {
  useEffect(() => {
    void initializeCache();
  }, []);

  const clear = useCallback(() => clearCache(), []);
  const invalidate = useCallback(
    (albumId?: number) => invalidateCache(albumId),
    [],
  );

  return useMemo(
    () => ({
      getMessages,
      saveMessages,
      replaceMessages,
      removeMessage,
      saveMessage,
      getAlbum,
      getAlbums,
      saveAlbum,
      saveAlbums,
      getCollaborators,
      saveCollaborators,
      saveUsers,
      maxMessagesPerAlbum: MAX_MESSAGES_PER_ALBUM,
      clear,
      invalidate,
    }),
    [clear, invalidate],
  );
}
