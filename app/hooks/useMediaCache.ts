"use client";

const MEDIA_CACHE_NAME = "memoraa-media-v1";

export async function cacheMedia(url: string) {
  if (typeof window === "undefined" || !("caches" in window) || !url) return;
  try {
    const cache = await caches.open(MEDIA_CACHE_NAME);
    if (!(await cache.match(url))) {
      await cache.add(url);
    }
  } catch {
    // Media caching is best effort and must not interrupt playback.
  }
}

export async function cacheThumbnail(url: string) {
  return cacheMedia(url);
}

export async function getCachedMediaResponse(url: string) {
  if (typeof window === "undefined" || !("caches" in window) || !url) {
    return null;
  }
  try {
    return await (await caches.open(MEDIA_CACHE_NAME)).match(url);
  } catch {
    return null;
  }
}

export function useMediaCache() {
  return { cacheMedia, cacheThumbnail, getCachedMediaResponse };
}
