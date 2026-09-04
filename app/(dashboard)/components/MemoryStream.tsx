"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import {
  MoreHorizontal,
  Pencil,
  Paperclip,
  Send,
  Mic,
  Trash2,
  Heart,
  Pin,
  PinOff,
  Archive,
  ArchiveRestore,
  Info,
  PlayCircle,
} from "lucide-react";
import EditMemoryModal from "./EditMemoryModal";
import ForwardMemoryModal from "./ForwardMemoryModal";
import MediaViewer from "./MediaViewer";
import PhotoCaptionModal from "./PhotoCaptionModal";
import VideoTrimmerModal from "./VideoTrimmerModal";
import AudioRecorderModal from "./AudioRecorderModal";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSocket } from "@/app/hooks/useSocket";
import { useCache } from "@/app/hooks/useCache";
import { useMediaCache } from "@/app/hooks/useMediaCache";
import { renderMentionSegments, serializeMention } from "@/app/lib/mentions";
import { MOOD_META, normalizeMood } from "@/app/lib/moods";
import type { Memory, MemoryReactionRecord } from "@/app/types";

function mergeMemories(current: Memory[], incoming: Memory[]) {
  const merged = [...current];
  incoming.forEach((memory) => {
    const index = merged.findIndex(
      (existing) =>
        existing.id === memory.id ||
        (Boolean(memory.clientId) && existing.clientId === memory.clientId),
    );
    if (index >= 0) {
      merged[index] = { ...merged[index], ...memory };
    } else {
      merged.push(memory);
    }
  });
  return merged;
}

export default function MemoryStream({
  onAlbumHeaderClick,
}: { onAlbumHeaderClick?: () => void } = {}) {
  const { id: albumId } = useParams();
  const parsedAlbumId = albumId ? Number(albumId) : null;
  const socket = useSocket(parsedAlbumId);
  const cache = useCache();
  const mediaCache = useMediaCache();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const composerInputRef = useRef<HTMLInputElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const [memories, setMemories] = useState<Memory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [showArchivedOnly, setShowArchivedOnly] = useState(false);
  const [editingMemoryId, setEditingMemoryId] = useState<number | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<number | null>(null);
  const [viewerMemoryId, setViewerMemoryId] = useState<number | null>(null);
  const [forwardMemoryId, setForwardMemoryId] = useState<number | null>(null);
  const [pendingPhoto, setPendingPhoto] = useState<File | null>(null);
  const [pendingVideo, setPendingVideo] = useState<File | null>(null);
  const [isVoiceRecorderOpen, setIsVoiceRecorderOpen] = useState(false);
  const [canEditMemories, setCanEditMemories] = useState(false);
  const [currentUser, setCurrentUser] = useState<{
    id: number | null;
    name?: string | null;
  } | null>(null);
  const [typingUsers, setTypingUsers] = useState<
    Array<{ userId: number; userName: string }>
  >([]);
  const [mentionSuggestions, setMentionSuggestions] = useState<
    Array<{
      id: number;
      username: string;
      fullName?: string | null;
      email?: string;
    }>
  >([]);
  const [mentionQuery, setMentionQuery] = useState("");
  const [wallpaper, setWallpaper] = useState<{
    wallpaperType: string;
    wallpaperValue: string | null;
  } | null>(null);
  const typingActiveRef = useRef(false);
  const typingStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingRepeatTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const typingRemovalTimersRef = useRef<
    Map<number, ReturnType<typeof setTimeout>>
  >(new Map());

  const editingMemory =
    memories.find((memory) => memory.id === editingMemoryId) ?? null;

  const sortMemories = useCallback((items: Memory[]) => {
    return [...items].sort((a, b) => {
      if (a.isPinned && !b.isPinned) {
        return -1;
      }
      if (!a.isPinned && b.isPinned) {
        return 1;
      }
      if (a.isPinned && b.isPinned) {
        const aPinnedAt = a.pinnedAt ? new Date(a.pinnedAt).getTime() : 0;
        const bPinnedAt = b.pinnedAt ? new Date(b.pinnedAt).getTime() : 0;
        return bPinnedAt - aPinnedAt;
      }
      const createdAtDifference =
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return createdAtDifference || a.id - b.id;
    });
  }, []);

  const groupMemoriesByDate = useCallback((items: Memory[]) => {
    const groups = new Map<string, Memory[]>();

    items.forEach((memory) => {
      const date = new Date(memory.createdAt);
      const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      const group = groups.get(dateKey) ?? [];
      group.push(memory);
      groups.set(dateKey, group);
    });

    return Array.from(groups, ([dateKey, group]) => ({ dateKey, group }));
  }, []);

  const formatDateHeader = useCallback((dateKey: string) => {
    const [year, month, day] = dateKey.split("-").map(Number);
    const date = new Date(year, month, day);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    }

    return new Intl.DateTimeFormat(undefined, {
      month: "numeric",
      day: "numeric",
      year: "numeric",
    }).format(date);
  }, []);

  const fetchMemories = useCallback(async () => {
    if (!parsedAlbumId) {
      return;
    }

    const cachedMemories = await cache.getMessages(parsedAlbumId);
    if (cachedMemories.length > 0) {
      setMemories(sortMemories(mergeMemories([], cachedMemories)));
      setIsLoading(false);
    }

    try {
      const response = await fetch(`/api/albums/${parsedAlbumId}/memories`, {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch memories: ${response.status}`);
      }
      const data = await response.json();
      const freshMemories = (
        Array.isArray(data.data) ? data.data : []
      ) as Memory[];
      setMemories(sortMemories(mergeMemories([], freshMemories)));
      await cache.replaceMessages(parsedAlbumId, freshMemories);
      await cache.saveUsers(
        freshMemories.flatMap((memory) =>
          memory.sender ? [memory.sender] : [],
        ),
      );
      setIsOffline(false);
    } catch (error) {
      console.error("Error fetching memories:", error);
      setIsOffline(true);
    } finally {
      setIsLoading(false);
    }
  }, [cache, parsedAlbumId, sortMemories]);

  useEffect(() => {
    if (!albumId || !parsedAlbumId) {
      return;
    }

    queueMicrotask(() => void fetchMemories());

    fetch(`/api/albums/${albumId}/collaborators`)
      .then((response) => response.json())
      .then((data) => {
        const nextOptions = Array.isArray(data?.data) ? data.data : [];
        setMentionSuggestions(nextOptions);
        void cache.saveCollaborators(parsedAlbumId, nextOptions);
      })
      .catch(async () => {
        const cached = await cache.getCollaborators(parsedAlbumId);
        setMentionSuggestions(cached);
      });

    fetch(`/api/albums/${albumId}`)
      .then((response) => response.json())
      .then((data) => {
        if (data?.data) {
          void cache.saveAlbum(data.data);
        }
        const permission = data?.data?.permission ?? data?.permission;
        const role = data?.data?.role ?? data?.role;
        setCanEditMemories(
          role === "owner" || permission === "edit" || permission === "admin",
        );
      })
      .catch(() => setCanEditMemories(false));
  }, [albumId, cache, fetchMemories, parsedAlbumId]);

  useEffect(() => {
    const updateConnection = () => setIsOffline(!navigator.onLine);
    updateConnection();
    window.addEventListener("online", updateConnection);
    window.addEventListener("offline", updateConnection);
    return () => {
      window.removeEventListener("online", updateConnection);
      window.removeEventListener("offline", updateConnection);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    fetch("/api/auth/session")
      .then((response) => response.json())
      .then((sessionData) => {
        if (!isMounted) {
          return;
        }

        const nextUserId = sessionData?.user?.id
          ? Number(sessionData.user.id)
          : null;
        setCurrentUser({
          id: Number.isFinite(nextUserId) ? nextUserId : null,
          name: sessionData?.user?.name ?? null,
        });
      })
      .catch(() => {
        if (isMounted) {
          setCurrentUser({ id: null, name: null });
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    fetch("/api/user/wallpaper")
      .then((response) => response.json())
      .then((data) => setWallpaper(data?.data ?? null))
      .catch(() => setWallpaper(null));
  }, []);

  useEffect(() => {
    if (!socket || !parsedAlbumId) {
      return;
    }

    const handleTyping = (payload: {
      albumId?: number;
      userId?: number;
      userName?: string;
    }) => {
      if (payload.albumId !== parsedAlbumId || !payload.userId) {
        return;
      }

      const nextUserId = Number(payload.userId);
      if (
        currentUser &&
        currentUser.id !== null &&
        Number(currentUser.id) === nextUserId
      ) {
        return;
      }

      const nextUserName = payload.userName || "Someone";
      setTypingUsers((currentTypingUsers) => {
        if (
          currentTypingUsers.some(
            (typingUser) => Number(typingUser.userId) === nextUserId,
          )
        ) {
          return currentTypingUsers;
        }

        return [
          ...currentTypingUsers,
          { userId: nextUserId, userName: nextUserName },
        ];
      });

      const existingTimer = typingRemovalTimersRef.current.get(nextUserId);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      const removalTimer = setTimeout(() => {
        setTypingUsers((currentTypingUsers) =>
          currentTypingUsers.filter(
            (typingUser) => Number(typingUser.userId) !== nextUserId,
          ),
        );
      }, 3000);

      typingRemovalTimersRef.current.set(nextUserId, removalTimer);
    };

    const handleStoppedTyping = (payload: {
      albumId?: number;
      userId?: number;
    }) => {
      if (payload.albumId !== parsedAlbumId || !payload.userId) {
        return;
      }

      const nextUserId = Number(payload.userId);
      setTypingUsers((currentTypingUsers) =>
        currentTypingUsers.filter(
          (typingUser) => Number(typingUser.userId) !== nextUserId,
        ),
      );
      const existingTimer = typingRemovalTimersRef.current.get(nextUserId);
      if (existingTimer) {
        clearTimeout(existingTimer);
        typingRemovalTimersRef.current.delete(nextUserId);
      }
    };

    socket.on("typing", handleTyping);
    socket.on("stopped_typing", handleStoppedTyping);

    return () => {
      socket.off("typing", handleTyping);
      socket.off("stopped_typing", handleStoppedTyping);
    };
  }, [socket, parsedAlbumId, currentUser?.id]);

  useEffect(() => {
    if (!socket) {
      return;
    }

    const handleMemoryUpdated = (payload: {
      albumId?: number;
      memory?: Memory;
    }) => {
      const nextMemory = payload.memory;
      if (!nextMemory || payload.albumId !== parsedAlbumId) {
        return;
      }

      setMemories((currentMemories) =>
        sortMemories(
          currentMemories.map((memory) =>
            memory.id === nextMemory.id ? { ...memory, ...nextMemory } : memory,
          ),
        ),
      );
      void cache.saveMessage(parsedAlbumId, nextMemory);
    };

    const handleMemoryDeleted = (payload: {
      albumId?: number;
      memoryId?: number;
    }) => {
      if (payload.albumId !== parsedAlbumId || !payload.memoryId) {
        return;
      }

      setMemories((currentMemories) =>
        currentMemories.filter((memory) => memory.id !== payload.memoryId),
      );
      if (payload.memoryId) {
        void cache.removeMessage(parsedAlbumId, payload.memoryId);
      }
    };

    const handleNewMemory = (payload: {
      albumId?: number;
      memory?: Memory;
    }) => {
      if (payload.albumId !== parsedAlbumId || !payload.memory) {
        return;
      }

      setMemories((currentMemories) =>
        sortMemories(mergeMemories(currentMemories, [payload.memory!])),
      );
      void cache.saveMessage(parsedAlbumId, payload.memory);
      void fetchMemories();
    };

    const handleMemoryPinned = (payload: {
      albumId?: number;
      memory?: Memory;
    }) => {
      const nextMemory = payload.memory;
      if (!nextMemory || payload.albumId !== parsedAlbumId) {
        return;
      }

      setMemories((currentMemories) =>
        sortMemories(
          currentMemories.map((memory) =>
            memory.id === nextMemory.id ? { ...memory, ...nextMemory } : memory,
          ),
        ),
      );
      void cache.saveMessage(parsedAlbumId, nextMemory);
    };

    const handleReactionUpdated = (payload: {
      albumId?: number;
      memoryId?: number;
      reactions?: MemoryReactionRecord[];
    }) => {
      if (payload.albumId !== parsedAlbumId || !payload.memoryId) {
        return;
      }

      setMemories((currentMemories) =>
        currentMemories.map((memory) =>
          memory.id === payload.memoryId
            ? {
                ...memory,
                reactions: payload.reactions ?? memory.reactions ?? [],
              }
            : memory,
        ),
      );
      const updatedMemory = memories.find(
        (memory) => memory.id === payload.memoryId,
      );
      if (updatedMemory) {
        void cache.saveMessage(parsedAlbumId, {
          ...updatedMemory,
          reactions: payload.reactions ?? [],
        });
      }
    };

    socket.on("new_memory", handleNewMemory);
    socket.on("memory_updated", handleMemoryUpdated);
    socket.on("memory_pinned", handleMemoryPinned);
    socket.on("memory_deleted", handleMemoryDeleted);
    socket.on("reaction_updated", handleReactionUpdated);

    return () => {
      socket.off("new_memory", handleNewMemory);
      socket.off("memory_updated", handleMemoryUpdated);
      socket.off("memory_pinned", handleMemoryPinned);
      socket.off("memory_deleted", handleMemoryDeleted);
      socket.off("reaction_updated", handleReactionUpdated);
    };
  }, [cache, fetchMemories, memories, parsedAlbumId, socket, sortMemories]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [memories]);

  const stopTyping = useCallback(() => {
    if (
      !socket ||
      !parsedAlbumId ||
      !currentUser?.id ||
      !typingActiveRef.current
    ) {
      return;
    }

    socket.emit("stopped_typing", {
      albumId: parsedAlbumId,
      userId: Number(currentUser.id),
      userName: currentUser.name || "You",
    });
    typingActiveRef.current = false;

    if (typingStopTimerRef.current) {
      clearTimeout(typingStopTimerRef.current);
      typingStopTimerRef.current = null;
    }

    if (typingRepeatTimerRef.current) {
      clearTimeout(typingRepeatTimerRef.current);
      typingRepeatTimerRef.current = null;
    }
  }, [socket, parsedAlbumId, currentUser]);

  const handleTypingStart = useCallback(() => {
    if (!socket || !parsedAlbumId || !currentUser?.id) {
      return;
    }

    const payload = {
      albumId: parsedAlbumId,
      userId: Number(currentUser.id),
      userName: currentUser.name || "You",
    };

    if (!typingActiveRef.current) {
      typingActiveRef.current = true;
      socket.emit("typing", payload);
    }

    if (typingRepeatTimerRef.current) {
      clearTimeout(typingRepeatTimerRef.current);
    }

    typingRepeatTimerRef.current = setTimeout(() => {
      if (typingActiveRef.current) {
        socket.emit("typing", payload);
      }
    }, 3000);

    if (typingStopTimerRef.current) {
      clearTimeout(typingStopTimerRef.current);
    }

    typingStopTimerRef.current = setTimeout(() => {
      stopTyping();
    }, 1000);
  }, [socket, parsedAlbumId, currentUser, stopTyping]);

  const handleComposerInputChange = useCallback(
    (value: string) => {
      setMessageText(value);

      const currentMentionMatch = value.match(/(?:^|\s)@([^\s@]*)$/);
      if (currentMentionMatch) {
        const partial = currentMentionMatch[1]?.trim().toLowerCase() ?? "";
        setMentionQuery(partial);
      } else {
        setMentionQuery("");
      }

      if (!value.trim()) {
        stopTyping();
        return;
      }

      handleTypingStart();
    },
    [handleTypingStart, stopTyping],
  );

  const insertMention = useCallback(
    (user: { id: number; username: string }) => {
      const mentionToken = serializeMention(user.id, user.username);
      const mentionMatcher = /(?:^|\s)@([^\s@]*)$/;
      const nextValue = messageText.replace(mentionMatcher, (match, query) => {
        const prefix = match.startsWith(" ") ? " " : "";
        return `${prefix}${mentionToken} `;
      });

      setMessageText(nextValue);
      setMentionQuery("");
      setTimeout(() => {
        composerInputRef.current?.focus();
      }, 0);
    },
    [messageText],
  );

  const handleSendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!messageText.trim() || !albumId || isSending) {
      return;
    }

    stopTyping();

    setIsSending(true);
    const clientId =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `client-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const optimisticMemoryId = -Date.now();
    const optimisticMemory: Memory = {
      id: optimisticMemoryId,
      clientId,
      albumId: parsedAlbumId,
      memoryType: "text",
      encryptedContent: messageText,
      isFavorite: false,
      isPinned: false,
      isArchived: false,
      viewCount: 0,
      memoryDate: new Date(),
      userId: currentUser?.id ?? 0,
      status: "ready",
      createdAt: new Date(),
      updatedAt: new Date(),
      sender: currentUser?.name
        ? {
            id: currentUser.id ?? 0,
            username: currentUser.name,
            fullName: currentUser.name,
          }
        : undefined,
    };
    setMemories((currentMemories) =>
      sortMemories([...currentMemories, optimisticMemory]),
    );
    if (parsedAlbumId) {
      void cache.saveMessage(parsedAlbumId, optimisticMemory);
    }

    try {
      // POST to album-scoped memories endpoint. Use parsedAlbumId to ensure a numeric id is sent.
      const targetAlbumId = parsedAlbumId ?? (albumId ? Number(albumId) : null);
      if (!Number.isFinite(targetAlbumId)) {
        console.error("Invalid album id when sending message:", {
          albumId,
          parsedAlbumId,
          targetAlbumId,
        });
        throw new Error("No valid album selected");
      }

      const response = await fetch(`/api/albums/${targetAlbumId}/memories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          memoryType: "text",
          content: messageText,
          albumId: targetAlbumId,
          memoryDate: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => null);
        throw new Error(text || `Failed to create memory: ${response.status}`);
      }

      const data = await response.json();
      const confirmedMemory = data?.data as Memory | undefined;
      if (confirmedMemory) {
        setMemories((currentMemories) =>
          sortMemories(mergeMemories(currentMemories, [confirmedMemory])),
        );
        if (parsedAlbumId) {
          void cache.saveMessage(parsedAlbumId, confirmedMemory);
        }
      }

      // Success: clear input and refresh list
      setMessageText("");
      await fetchMemories();
    } catch (error) {
      console.error("Error sending message:", error);
      setMemories((currentMemories) =>
        currentMemories.filter((memory) => memory.id !== optimisticMemoryId),
      );
      if (parsedAlbumId) {
        void cache.removeMessage(parsedAlbumId, optimisticMemoryId);
      }
      if (error instanceof Error) {
        window.alert(`Failed to send message: ${error.message}`);
      } else {
        window.alert("Failed to send message");
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleFileSelection = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile || !parsedAlbumId) {
      return;
    }

    if (selectedFile.type.startsWith("video/")) {
      setPendingVideo(selectedFile);
    } else {
      setPendingPhoto(selectedFile);
    }

    if (event.target) {
      event.target.value = "";
    }
  };

  const handlePhotoUpload = async (payload: {
    caption: string;
    keepOriginalQuality: boolean;
  }) => {
    if (!pendingPhoto || !parsedAlbumId) {
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);

      const uploadFormData = new FormData();
      uploadFormData.append("file", pendingPhoto);
      uploadFormData.append("albumId", String(parsedAlbumId));
      uploadFormData.append("caption", payload.caption);
      uploadFormData.append(
        "keepOriginalQuality",
        String(payload.keepOriginalQuality),
      );

      const xhr = new XMLHttpRequest();

      xhr.upload.onprogress = (progressEvent) => {
        if (!progressEvent.lengthComputable) {
          return;
        }

        const percentage = Math.round(
          (progressEvent.loaded / progressEvent.total) * 100,
        );
        setUploadProgress(percentage);
      };

      xhr.onload = async () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          setPendingPhoto(null);
          await fetchMemories();
        } else {
          try {
            const response = JSON.parse(xhr.responseText) as { error?: string };
            window.alert(response?.error || "Upload failed");
          } catch {
            window.alert("Upload failed");
          }
        }

        setIsUploading(false);
        setUploadProgress(0);
      };

      xhr.onerror = () => {
        window.alert("Network error while uploading image");
        setIsUploading(false);
        setUploadProgress(0);
      };

      xhr.open("POST", "/api/media/upload");
      xhr.send(uploadFormData);
    } catch (error) {
      console.error("Error uploading photo:", error);
      window.alert(
        error instanceof Error ? error.message : "Unable to upload photo",
      );
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleVideoUpload = async (payload: {
    caption: string;
    startTime: number;
    endTime: number;
  }) => {
    if (!pendingVideo || !parsedAlbumId) {
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);

      const uploadFormData = new FormData();
      uploadFormData.append("file", pendingVideo);
      uploadFormData.append("albumId", String(parsedAlbumId));
      uploadFormData.append("caption", payload.caption);
      uploadFormData.append("keepOriginalQuality", "false");
      uploadFormData.append("startTime", String(payload.startTime));
      uploadFormData.append("endTime", String(payload.endTime));

      const xhr = new XMLHttpRequest();

      xhr.upload.onprogress = (progressEvent) => {
        if (!progressEvent.lengthComputable) {
          return;
        }

        const percentage = Math.round(
          (progressEvent.loaded / progressEvent.total) * 100,
        );
        setUploadProgress(percentage);
      };

      xhr.onload = async () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          setPendingVideo(null);
          await fetchMemories();
        } else {
          try {
            const response = JSON.parse(xhr.responseText) as { error?: string };
            window.alert(response?.error || "Upload failed");
          } catch {
            window.alert("Upload failed");
          }
        }

        setIsUploading(false);
        setUploadProgress(0);
      };

      xhr.onerror = () => {
        window.alert("Network error while uploading video");
        setIsUploading(false);
        setUploadProgress(0);
      };

      xhr.open("POST", "/api/media/upload");
      xhr.send(uploadFormData);
    } catch (error) {
      console.error("Error uploading video:", error);
      window.alert(
        error instanceof Error ? error.message : "Unable to upload video",
      );
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleVoiceUpload = async (file: File) => {
    if (!file || !parsedAlbumId) {
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);

      const uploadFormData = new FormData();
      uploadFormData.append("file", file);
      uploadFormData.append("albumId", String(parsedAlbumId));
      uploadFormData.append("caption", "");
      uploadFormData.append("keepOriginalQuality", "false");

      const xhr = new XMLHttpRequest();

      xhr.upload.onprogress = (progressEvent) => {
        if (!progressEvent.lengthComputable) {
          return;
        }

        const percentage = Math.round(
          (progressEvent.loaded / progressEvent.total) * 100,
        );
        setUploadProgress(percentage);
      };

      xhr.onload = async () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          await fetchMemories();
        } else {
          try {
            const response = JSON.parse(xhr.responseText) as { error?: string };
            window.alert(response?.error || "Voice upload failed");
          } catch {
            window.alert("Voice upload failed");
          }
        }

        setIsUploading(false);
        setUploadProgress(0);
      };

      xhr.onerror = () => {
        window.alert("Network error while uploading voice message");
        setIsUploading(false);
        setUploadProgress(0);
      };

      xhr.open("POST", "/api/media/upload");
      xhr.send(uploadFormData);
    } catch (error) {
      console.error("Error uploading voice message:", error);
      window.alert(
        error instanceof Error
          ? error.message
          : "Unable to upload voice message",
      );
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleEditSave = async (payload: {
    content: string;
    memoryDate: string;
  }) => {
    if (!editingMemory || !parsedAlbumId) {
      return;
    }

    setIsSavingEdit(true);

    try {
      const response = await fetch(`/api/memories/${editingMemory.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: payload.content,
          memoryDate: payload.memoryDate,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Failed to update memory");
      }

      const updatedMemory = data.data as Memory;
      setMemories((currentMemories) =>
        currentMemories.map((memory) =>
          memory.id === updatedMemory.id
            ? { ...memory, ...updatedMemory }
            : memory,
        ),
      );

      socket?.emit("memory_updated", {
        albumId: parsedAlbumId,
        memory: updatedMemory,
      });

      setEditingMemoryId(null);
    } catch (error) {
      console.error("Error updating memory:", error);
      window.alert(
        error instanceof Error ? error.message : "Unable to update memory",
      );
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteMemory = async (memoryId: number) => {
    if (!parsedAlbumId || !window.confirm("Delete this memory?")) {
      return;
    }

    setIsDeletingId(memoryId);

    try {
      const response = await fetch(`/api/memories/${memoryId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Failed to delete memory");
      }

      setMemories((currentMemories) =>
        currentMemories.filter((memory) => memory.id !== memoryId),
      );

      socket?.emit("memory_deleted", {
        albumId: parsedAlbumId,
        memoryId,
      });
    } catch (error) {
      console.error("Error deleting memory:", error);
      window.alert(
        error instanceof Error ? error.message : "Unable to delete memory",
      );
    } finally {
      setIsDeletingId(null);
      setMenuOpenId(null);
    }
  };

  const handleToggleFavorite = async (
    memoryId: number,
    currentValue: boolean,
  ) => {
    if (!parsedAlbumId) {
      return;
    }

    const nextValue = !currentValue;
    const previousValue = currentValue;

    setMemories((currentMemories) =>
      currentMemories.map((memory) =>
        memory.id === memoryId ? { ...memory, isFavorite: nextValue } : memory,
      ),
    );

    try {
      const response = await fetch(`/api/memories/${memoryId}/favorite`, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Failed to update favorite status");
      }

      const updatedMemory = data.data as Memory;
      setMemories((currentMemories) =>
        currentMemories.map((memory) =>
          memory.id === updatedMemory.id
            ? { ...memory, ...updatedMemory }
            : memory,
        ),
      );

      socket?.emit("memory_updated", {
        albumId: parsedAlbumId,
        memory: updatedMemory,
      });
    } catch (error) {
      console.error("Error toggling favorite:", error);
      setMemories((currentMemories) =>
        currentMemories.map((memory) =>
          memory.id === memoryId
            ? { ...memory, isFavorite: previousValue }
            : memory,
        ),
      );
      window.alert(
        error instanceof Error
          ? error.message
          : "Unable to update favorite status",
      );
    }
  };

  const handleTogglePin = async (memoryId: number, currentValue: boolean) => {
    if (!parsedAlbumId) {
      return;
    }

    const nextValue = !currentValue;
    const previousValue = currentValue;

    setMemories((currentMemories) =>
      sortMemories(
        currentMemories.map((memory) =>
          memory.id === memoryId
            ? {
                ...memory,
                isPinned: nextValue,
                pinnedAt: nextValue ? new Date().toISOString() : null,
              }
            : memory,
        ),
      ),
    );

    try {
      const response = await fetch(`/api/memories/${memoryId}/pin`, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Failed to update pin status");
      }

      const updatedMemory = data.data as Memory;
      setMemories((currentMemories) =>
        sortMemories(
          currentMemories.map((memory) =>
            memory.id === updatedMemory.id
              ? { ...memory, ...updatedMemory }
              : memory,
          ),
        ),
      );

      socket?.emit("memory_pinned", {
        albumId: parsedAlbumId,
        memory: updatedMemory,
      });
      socket?.emit("memory_updated", {
        albumId: parsedAlbumId,
        memory: updatedMemory,
      });
    } catch (error) {
      console.error("Error toggling pin:", error);
      setMemories((currentMemories) =>
        sortMemories(
          currentMemories.map((memory) =>
            memory.id === memoryId
              ? {
                  ...memory,
                  isPinned: previousValue,
                  pinnedAt: previousValue
                    ? (memory.pinnedAt ?? new Date().toISOString())
                    : null,
                }
              : memory,
          ),
        ),
      );
      window.alert(
        error instanceof Error ? error.message : "Unable to update pin status",
      );
    }
  };

  const handleToggleArchive = async (
    memoryId: number,
    currentValue: boolean,
  ) => {
    if (!parsedAlbumId) {
      return;
    }

    const nextValue = !currentValue;
    const previousValue = currentValue;

    setMemories((currentMemories) =>
      currentMemories.map((memory) =>
        memory.id === memoryId ? { ...memory, isArchived: nextValue } : memory,
      ),
    );

    try {
      const response = await fetch(`/api/memories/${memoryId}/archive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived: nextValue }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Failed to update archive status");
      }

      const updatedMemory = data.data as Memory;
      setMemories((currentMemories) =>
        currentMemories.map((memory) =>
          memory.id === updatedMemory.id
            ? { ...memory, ...updatedMemory }
            : memory,
        ),
      );

      socket?.emit("memory_archived", {
        albumId: parsedAlbumId,
        memory: updatedMemory,
      });
      socket?.emit("memory_updated", {
        albumId: parsedAlbumId,
        memory: updatedMemory,
      });
    } catch (error) {
      console.error("Error toggling archive:", error);
      setMemories((currentMemories) =>
        currentMemories.map((memory) =>
          memory.id === memoryId
            ? { ...memory, isArchived: previousValue }
            : memory,
        ),
      );
      window.alert(
        error instanceof Error
          ? error.message
          : "Unable to update archive status",
      );
    }
  };

  const handleToggleReaction = async (memoryId: number, emoji: string) => {
    if (!parsedAlbumId || !emoji.trim()) {
      return;
    }

    try {
      const response = await fetch(`/api/memories/${memoryId}/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Failed to update reaction");
      }

      const nextReactions = (data?.data?.reactions ??
        []) as MemoryReactionRecord[];
      setMemories((currentMemories) =>
        currentMemories.map((memory) =>
          memory.id === memoryId
            ? { ...memory, reactions: nextReactions }
            : memory,
        ),
      );

      socket?.emit("reaction_updated", {
        albumId: parsedAlbumId,
        memoryId,
        reactions: nextReactions,
      });
    } catch (error) {
      console.error("Error toggling reaction:", error);
      window.alert(
        error instanceof Error ? error.message : "Unable to update reaction",
      );
    }
  };

  if (!albumId) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-gray-50">
        <p className="text-gray-500">Select an album to view memories</p>
      </div>
    );
  }

  const mediaMemories = memories.filter(
    (memory) => memory.memoryType === "photo" || memory.memoryType === "video",
  );
  const sortedMemories = sortMemories(memories);
  const filteredMemories = sortedMemories.filter((memory) => {
    if (showArchivedOnly) {
      return memory.isArchived;
    }
    return !memory.isArchived;
  });
  const visibleMemories = showFavoritesOnly
    ? filteredMemories.filter((memory) => memory.isFavorite)
    : filteredMemories;

  const pinnedMemories = visibleMemories.filter((memory) => memory.isPinned);
  const unpinnedMemories = visibleMemories.filter((memory) => !memory.isPinned);
  const groupedPinnedMemories = groupMemoriesByDate(pinnedMemories);
  const groupedUnpinnedMemories = groupMemoriesByDate(unpinnedMemories);

  const typingLabel =
    typingUsers.length === 0
      ? ""
      : typingUsers.length === 1
        ? `${typingUsers[0].userName} is typing...`
        : typingUsers.length === 2
          ? `${typingUsers[0].userName} and ${typingUsers[1].userName} are typing...`
          : `${typingUsers
              .slice(0, 2)
              .map((user) => user.userName)
              .join(", ")} and ${typingUsers.length - 2} more are typing...`;

  const wallpaperClass =
    wallpaper?.wallpaperType === "pattern"
      ? `wallpaper-pattern-${wallpaper.wallpaperValue}`
      : "";
  const wallpaperStyle =
    wallpaper?.wallpaperType === "solid"
      ? { backgroundColor: wallpaper.wallpaperValue ?? undefined }
      : wallpaper?.wallpaperType === "image"
        ? {
            backgroundImage: "url(/api/user/wallpaper/image)",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }
        : undefined;

  return (
    <div
      className={`flex min-h-0 flex-1 flex-col bg-white ${wallpaperClass}`}
      style={wallpaperStyle}
      data-chat-theme-chat-background={wallpaper?.wallpaperType ?? "default"}
    >
      {isOffline && memories.length > 0 && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs text-amber-800">
          You are offline. Viewing cached memories.
        </div>
      )}
      <div
        ref={scrollRef}
        className="scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-transparent min-h-0 flex-1 overflow-y-auto p-4 space-y-4"
      >
        <div className="flex justify-end gap-2">
          {onAlbumHeaderClick && (
            <button
              type="button"
              onClick={onAlbumHeaderClick}
              className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
              aria-label="Open album info"
            >
              <Info size={14} />
              Album info
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowArchivedOnly((current) => !current)}
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition ${
              showArchivedOnly
                ? "border-amber-200 bg-amber-50 text-amber-700"
                : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            {showArchivedOnly ? (
              <ArchiveRestore size={14} />
            ) : (
              <Archive size={14} />
            )}
            {showArchivedOnly ? "Show active" : "Show archived"}
          </button>

          <button
            type="button"
            onClick={() => setShowFavoritesOnly((current) => !current)}
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition ${
              showFavoritesOnly
                ? "border-pink-200 bg-pink-50 text-pink-700"
                : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Heart
              size={14}
              className={
                showFavoritesOnly
                  ? "fill-current text-pink-500"
                  : "text-gray-500"
              }
            />
            Favorites only
          </button>
        </div>

        {isLoading ? (
          <div className="flex min-h-full items-center justify-center">
            <p className="text-gray-500">Loading memories...</p>
          </div>
        ) : visibleMemories.length === 0 ? (
          <div className="flex min-h-full items-center justify-center">
            <p className="text-gray-500">
              {showFavoritesOnly
                ? "No favorite memories yet."
                : "No memories yet. Create one!"}
            </p>
          </div>
        ) : (
          <>
            {pinnedMemories.length > 0 && (
              <div className="flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-wide text-amber-600">
                <Pin size={12} className="fill-current" />
                Pinned
              </div>
            )}
            {[groupedPinnedMemories, groupedUnpinnedMemories].map(
              (dateGroups, groupIndex) =>
                dateGroups.length === 0 ? null : (
                  <div key={groupIndex} className="space-y-4">
                    {dateGroups.map(({ dateKey, group }) => (
                      <div key={dateKey} className="space-y-4">
                        <div className="flex justify-center py-1">
                          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-500 shadow-sm">
                            {formatDateHeader(dateKey)}
                          </span>
                        </div>
                        {group.map((memory) => {
                          const isOwn =
                            currentUser?.id !== null &&
                            currentUser?.id !== undefined &&
                            Number(memory.userId) === Number(currentUser.id);
                          const bubbleSurfaceClass = isOwn
                            ? "border-[#c5e8b8] bg-[#DCF8C6] text-gray-800 shadow-sm"
                            : "border-gray-200 bg-white text-gray-900 shadow-sm";

                          const imageSrc =
                            memory.memoryType === "photo" &&
                            (memory.thumbnailPath || memory.encryptedFilePath)
                              ? `/api/media/${encodeURIComponent(memory.thumbnailPath || memory.encryptedFilePath || "")}`
                              : memory.memoryType === "video" &&
                                  memory.thumbnailPath
                                ? `/api/media/${encodeURIComponent(memory.thumbnailPath)}`
                                : "";

                          const audioSrc =
                            (memory.memoryType === "voice" ||
                              memory.memoryType === "audio") &&
                            memory.encryptedFilePath
                              ? `/api/media/${encodeURIComponent(memory.encryptedFilePath)}`
                              : "";

                          const mentionSegments =
                            memory.memoryType === "text"
                              ? renderMentionSegments(
                                  memory.encryptedContent || "",
                                )
                              : [];
                          const moodInfo = normalizeMood(memory.mood);
                          const isMediaMemory =
                            memory.memoryType === "photo" ||
                            memory.memoryType === "video";
                          const senderName =
                            memory.sender?.fullName ||
                            memory.sender?.username ||
                            "Unknown user";
                          const incomingSender = !isOwn && memory.sender && (
                            <div className="mb-1 text-xs font-semibold text-blue-700">
                              {senderName}
                            </div>
                          );

                          return (
                            <div
                              key={memory.id}
                              id={`memory-${memory.id}`}
                              className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                            >
                              <div
                                className={`relative flex w-full items-start gap-2 ${
                                  isMediaMemory
                                    ? "max-w-[268px]"
                                    : "max-w-[75%]"
                                } ${isOwn ? "justify-end" : "justify-start"}`}
                              >
                                {!isOwn && (
                                  <Avatar size="sm" className="mt-1 size-7">
                                    {memory.sender?.avatar && (
                                      <AvatarImage
                                        src={`${memory.sender.avatar}?albumId=${parsedAlbumId}`}
                                        alt={senderName}
                                      />
                                    )}
                                    <AvatarFallback className="bg-gray-200 text-xs font-semibold text-gray-600">
                                      {senderName.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                )}
                                {memory.memoryType === "photo" ? (
                                  <div
                                    className={`relative w-[240px] max-w-full min-w-0 overflow-hidden rounded-2xl border ${bubbleSurfaceClass}`}
                                  >
                                    <div className="px-3 pt-2">
                                      {incomingSender}
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setViewerMemoryId(memory.id)
                                      }
                                      className="block w-full text-left"
                                      aria-label="Open photo gallery"
                                    >
                                      {imageSrc ? (
                                        <img
                                          src={imageSrc}
                                          alt="Uploaded memory"
                                          loading="lazy"
                                          onLoad={() =>
                                            void mediaCache.cacheMedia(imageSrc)
                                          }
                                          className="h-auto max-h-[600px] w-[240px] max-w-full object-contain"
                                        />
                                      ) : (
                                        <div className="flex h-64 w-full items-center justify-center bg-gray-100 text-sm text-gray-500">
                                          Photo unavailable
                                        </div>
                                      )}
                                    </button>
                                    <div
                                      className={`flex items-center justify-between gap-3 px-3 py-2 text-xs text-gray-500 ${bubbleSurfaceClass}`}
                                    >
                                      <span className="inline-flex items-center gap-1">
                                        {moodInfo ? (
                                          <>
                                            <span>
                                              {MOOD_META[moodInfo].emoji}
                                            </span>
                                            <span>
                                              {MOOD_META[moodInfo].label}
                                            </span>
                                          </>
                                        ) : null}
                                        <span>
                                          {new Date(
                                            memory.memoryDate ||
                                              memory.createdAt,
                                          ).toLocaleDateString()}
                                        </span>
                                      </span>
                                      <span>
                                        {new Date(
                                          memory.createdAt,
                                        ).toLocaleTimeString([], {
                                          hour: "numeric",
                                          minute: "2-digit",
                                        })}
                                      </span>
                                    </div>
                                    {memory.description && (
                                      <div
                                        className={`px-3 pb-2 text-sm text-gray-700 ${bubbleSurfaceClass}`}
                                      >
                                        {memory.description}
                                      </div>
                                    )}
                                  </div>
                                ) : memory.memoryType === "video" ? (
                                  <div
                                    className={`relative w-[240px] max-w-full min-w-0 overflow-hidden rounded-2xl border ${bubbleSurfaceClass}`}
                                  >
                                    <div className="px-3 pt-2">
                                      {incomingSender}
                                    </div>
                                    {imageSrc ? (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setViewerMemoryId(memory.id)
                                        }
                                        className="relative block w-full cursor-pointer bg-black text-left"
                                        aria-label="Open video viewer"
                                      >
                                        <img
                                          src={imageSrc}
                                          alt="Video thumbnail"
                                          loading="lazy"
                                          onLoad={() =>
                                            memory.thumbnailPath
                                              ? void mediaCache.cacheThumbnail(
                                                  imageSrc,
                                                )
                                              : undefined
                                          }
                                          className="h-auto max-h-[600px] w-[240px] max-w-full object-contain"
                                        />
                                        <span className="absolute inset-0 flex items-center justify-center bg-black/10">
                                          <span className="rounded-full bg-black/55 p-3 text-white shadow-lg transition-colors hover:bg-black/75">
                                            <PlayCircle size={48} />
                                          </span>
                                        </span>
                                      </button>
                                    ) : (
                                      <div className="flex h-64 w-[240px] max-w-full items-center justify-center bg-gray-100 text-sm text-gray-500">
                                        Video unavailable
                                      </div>
                                    )}
                                    <div
                                      className={`flex items-center justify-between gap-3 px-3 py-2 text-xs text-gray-500 ${bubbleSurfaceClass}`}
                                    >
                                      <span className="inline-flex items-center gap-1">
                                        {moodInfo ? (
                                          <>
                                            <span>
                                              {MOOD_META[moodInfo].emoji}
                                            </span>
                                            <span>
                                              {MOOD_META[moodInfo].label}
                                            </span>
                                          </>
                                        ) : null}
                                        <span>
                                          {new Date(
                                            memory.memoryDate ||
                                              memory.createdAt,
                                          ).toLocaleDateString()}
                                        </span>
                                      </span>
                                      <span>
                                        {new Date(
                                          memory.createdAt,
                                        ).toLocaleTimeString([], {
                                          hour: "numeric",
                                          minute: "2-digit",
                                        })}
                                      </span>
                                    </div>
                                    {memory.description && (
                                      <div
                                        className={`px-3 pb-2 text-sm text-gray-700 ${bubbleSurfaceClass}`}
                                      >
                                        {memory.description}
                                      </div>
                                    )}
                                  </div>
                                ) : memory.memoryType === "voice" ||
                                  memory.memoryType === "audio" ? (
                                  <div
                                    className={`relative w-full min-w-0 overflow-hidden rounded-2xl border ${bubbleSurfaceClass}`}
                                  >
                                    <div className="px-4 pt-2">
                                      {incomingSender}
                                    </div>
                                    <div className="bg-gray-50 px-4 py-3">
                                      <div className="mb-3 flex items-center justify-between text-xs text-gray-500">
                                        <span className="inline-flex items-center gap-2 font-medium text-gray-600">
                                          <Mic
                                            size={14}
                                            className="text-blue-600"
                                          />
                                          Voice note
                                        </span>
                                        {typeof memory.duration === "number" &&
                                          memory.duration > 0 && (
                                            <span>
                                              {new Date(memory.duration * 1000)
                                                .toISOString()
                                                .slice(14, 19)}
                                            </span>
                                          )}
                                      </div>

                                      <div className="mb-3 flex h-12 items-center rounded-xl border border-gray-200 bg-white px-2">
                                        <div className="flex h-10 w-full items-end gap-1">
                                          {Array.from({ length: 28 }).map(
                                            (_, index) => (
                                              <span
                                                key={index}
                                                className="w-1.5 rounded-full bg-blue-400/80"
                                                style={{
                                                  height: `${20 + ((index * 13) % 55)}%`,
                                                }}
                                              />
                                            ),
                                          )}
                                        </div>
                                      </div>

                                      {audioSrc ? (
                                        <audio
                                          controls
                                          src={audioSrc}
                                          preload="metadata"
                                          className="w-full"
                                        />
                                      ) : (
                                        <div className="flex h-12 items-center justify-center rounded-xl bg-gray-100 text-sm text-gray-500">
                                          Voice message unavailable
                                        </div>
                                      )}
                                    </div>

                                    <div
                                      className={`flex items-center justify-between gap-3 px-3 py-2 text-xs text-gray-500 ${bubbleSurfaceClass}`}
                                    >
                                      <span className="inline-flex items-center gap-1">
                                        {moodInfo ? (
                                          <>
                                            <span>
                                              {MOOD_META[moodInfo].emoji}
                                            </span>
                                            <span>
                                              {MOOD_META[moodInfo].label}
                                            </span>
                                          </>
                                        ) : null}
                                        <span>
                                          {new Date(
                                            memory.memoryDate ||
                                              memory.createdAt,
                                          ).toLocaleDateString()}
                                        </span>
                                      </span>
                                      <span>
                                        {new Date(
                                          memory.createdAt,
                                        ).toLocaleTimeString([], {
                                          hour: "numeric",
                                          minute: "2-digit",
                                        })}
                                      </span>
                                    </div>
                                    {memory.description && (
                                      <div
                                        className={`px-3 pb-2 text-sm text-gray-700 ${bubbleSurfaceClass}`}
                                      >
                                        {memory.description}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div
                                    className={`relative w-full min-w-0 rounded-2xl px-4 py-2 shadow-sm ${isOwn ? "bg-[#DCF8C6] text-gray-800" : "border border-gray-200 bg-white pt-2 text-gray-900"}`}
                                  >
                                    {incomingSender}
                                    <p className="whitespace-pre-wrap break-all">
                                      {mentionSegments.length > 0
                                        ? mentionSegments.map(
                                            (segment, index) =>
                                              segment.type === "mention" ? (
                                                <span
                                                  key={`${segment.userId ?? index}-${index}`}
                                                  className={`rounded px-1 py-0.5 font-semibold ${isOwn ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-700"}`}
                                                >
                                                  {segment.value}
                                                </span>
                                              ) : (
                                                <span key={`text-${index}`}>
                                                  {segment.value}
                                                </span>
                                              ),
                                          )
                                        : memory.encryptedContent}
                                    </p>
                                    <div className="mt-2 flex items-center justify-between gap-3">
                                      <span className="inline-flex items-center gap-1 text-[10px] text-gray-400">
                                        {moodInfo ? (
                                          <>
                                            <span>
                                              {MOOD_META[moodInfo].emoji}
                                            </span>
                                            <span>
                                              {MOOD_META[moodInfo].label}
                                            </span>
                                          </>
                                        ) : null}
                                        <span>
                                          {new Date(
                                            memory.memoryDate ||
                                              memory.createdAt,
                                          ).toLocaleDateString()}
                                        </span>
                                      </span>
                                      <span className="text-[10px] text-gray-400">
                                        {new Date(
                                          memory.createdAt,
                                        ).toLocaleTimeString([], {
                                          hour: "numeric",
                                          minute: "2-digit",
                                        })}
                                      </span>
                                    </div>
                                  </div>
                                )}

                                <div className="absolute right-1 top-1 z-10">
                                  <DropdownMenu
                                    open={menuOpenId === memory.id}
                                    onOpenChange={(open) =>
                                      setMenuOpenId(open ? memory.id : null)
                                    }
                                  >
                                    <DropdownMenuTrigger
                                      render={
                                        <Button
                                          size="icon-sm"
                                          variant="ghost"
                                          className="size-6 p-1 text-gray-400 shadow-none hover:bg-gray-100/70 hover:text-gray-600"
                                          aria-label="Memory actions"
                                        />
                                      }
                                    >
                                      <MoreHorizontal size={16} />
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent
                                      align="end"
                                      className="w-48"
                                    >
                                      <DropdownMenuItem
                                        onClick={() =>
                                          void handleToggleFavorite(
                                            memory.id,
                                            Boolean(memory.isFavorite),
                                          )
                                        }
                                        className="text-pink-600 focus:text-pink-600"
                                      >
                                        <Heart
                                          size={14}
                                          className={
                                            memory.isFavorite
                                              ? "fill-current"
                                              : ""
                                          }
                                        />
                                        {memory.isFavorite
                                          ? "Remove from favorites"
                                          : "Add to favorites"}
                                      </DropdownMenuItem>
                                      {isOwn && (
                                        <>
                                          <DropdownMenuItem
                                            onClick={() =>
                                              void handleTogglePin(
                                                memory.id,
                                                Boolean(memory.isPinned),
                                              )
                                            }
                                            disabled={!canEditMemories}
                                            className="text-amber-600 focus:text-amber-600"
                                          >
                                            {memory.isPinned ? (
                                              <PinOff size={14} />
                                            ) : (
                                              <Pin
                                                size={14}
                                                className="fill-current"
                                              />
                                            )}
                                            {memory.isPinned
                                              ? "Unpin memory"
                                              : "Pin memory"}
                                          </DropdownMenuItem>
                                          <DropdownMenuItem
                                            onClick={() =>
                                              setEditingMemoryId(memory.id)
                                            }
                                            className="text-gray-700"
                                          >
                                            <Pencil size={14} />
                                            Edit
                                          </DropdownMenuItem>
                                          <DropdownMenuItem
                                            onClick={() =>
                                              void handleToggleArchive(
                                                memory.id,
                                                Boolean(memory.isArchived),
                                              )
                                            }
                                            className="text-amber-600 focus:text-amber-600"
                                          >
                                            {memory.isArchived ? (
                                              <ArchiveRestore size={14} />
                                            ) : (
                                              <Archive size={14} />
                                            )}
                                            {memory.isArchived
                                              ? "Restore"
                                              : "Archive"}
                                          </DropdownMenuItem>
                                        </>
                                      )}
                                      <DropdownMenuItem
                                        onClick={() =>
                                          setForwardMemoryId(memory.id)
                                        }
                                        className="text-gray-700"
                                      >
                                        <Send size={14} />
                                        Forward
                                      </DropdownMenuItem>
                                      {isOwn && (
                                        <DropdownMenuItem
                                          onClick={() =>
                                            handleDeleteMemory(memory.id)
                                          }
                                          disabled={isDeletingId === memory.id}
                                          variant="destructive"
                                        >
                                          <Trash2 size={14} />
                                          {isDeletingId === memory.id
                                            ? "Deleting..."
                                            : "Delete"}
                                        </DropdownMenuItem>
                                      )}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                ),
            )}
          </>
        )}
      </div>

      <div className="p-4">
        {typingLabel && (
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-700">
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-500 [animation-delay:-0.2s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-500 [animation-delay:-0.1s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-500" />
            </span>
            <span>{typingLabel}</span>
          </div>
        )}

        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={handleFileSelection}
          />

          <button
            type="button"
            className="rounded-full bg-gray-100 p-2 text-gray-600 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-60"
            title="Attach photo or video"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            <Paperclip size={20} />
          </button>

          <button
            type="button"
            className="rounded-full bg-gray-100 p-2 text-gray-600 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-60"
            title="Voice message"
            onClick={() => setIsVoiceRecorderOpen(true)}
            disabled={isUploading}
          >
            <Mic size={20} />
          </button>

          <div className="relative flex-1">
            <input
              ref={composerInputRef}
              type="text"
              value={messageText}
              className="w-full rounded-full bg-gray-100 px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              onChange={(event) =>
                handleComposerInputChange(event.target.value)
              }
              onBlur={() => {
                stopTyping();
                setTimeout(() => setMentionQuery(""), 150);
              }}
            />
            {mentionQuery && (
              <div className="absolute bottom-full left-0 z-10 mb-2 max-h-40 w-full overflow-auto rounded-xl border border-gray-200 bg-white shadow-lg">
                {mentionSuggestions
                  .filter((user) => {
                    const searchTerm = mentionQuery.trim().toLowerCase();
                    if (!searchTerm) {
                      return true;
                    }
                    return [user.username, user.fullName, user.email]
                      .filter(Boolean)
                      .some((value) =>
                        String(value).toLowerCase().includes(searchTerm),
                      );
                  })
                  .slice(0, 6)
                  .map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        insertMention(user);
                      }}
                      className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-gray-50"
                    >
                      <div>
                        <div className="text-sm font-medium text-gray-800">
                          @{user.username || user.email}
                        </div>
                        {user.fullName && (
                          <div className="text-xs text-gray-500">
                            {user.fullName}
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                {mentionSuggestions.filter((user) => {
                  const searchTerm = mentionQuery.trim().toLowerCase();
                  if (!searchTerm) {
                    return true;
                  }
                  return [user.username, user.fullName, user.email]
                    .filter(Boolean)
                    .some((value) =>
                      String(value).toLowerCase().includes(searchTerm),
                    );
                }).length === 0 && (
                  <div className="px-3 py-2 text-sm text-gray-500">
                    No matching collaborators
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={!messageText.trim() || isSending}
            className="rounded-full bg-blue-600 p-2 text-white hover:bg-blue-700 disabled:bg-gray-400"
          >
            <Send size={20} />
          </button>
        </form>

        {isUploading && (
          <div className="mt-3">
            <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
              <span>Uploading photo</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-blue-600 transition-all duration-200"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {pendingPhoto && (
        <PhotoCaptionModal
          file={pendingPhoto}
          isUploading={isUploading}
          uploadProgress={uploadProgress}
          onCancel={() => setPendingPhoto(null)}
          onUpload={handlePhotoUpload}
        />
      )}

      {pendingVideo && (
        <VideoTrimmerModal
          file={pendingVideo}
          isUploading={isUploading}
          uploadProgress={uploadProgress}
          onCancel={() => setPendingVideo(null)}
          onConfirm={handleVideoUpload}
        />
      )}

      <AudioRecorderModal
        isOpen={isVoiceRecorderOpen}
        isUploading={isUploading}
        uploadProgress={uploadProgress}
        onClose={() => setIsVoiceRecorderOpen(false)}
        onUpload={(file) => {
          setIsVoiceRecorderOpen(false);
          void handleVoiceUpload(file);
        }}
      />

      {viewerMemoryId !== null && (
        <MediaViewer
          isOpen={true}
          albumId={parsedAlbumId ?? 0}
          media={mediaMemories}
          initialMediaIndex={Math.max(
            0,
            mediaMemories.findIndex((memory) => memory.id === viewerMemoryId),
          )}
          onClose={() => setViewerMemoryId(null)}
          onGoToMessage={(memoryId) => {
            setViewerMemoryId(null);
            window.setTimeout(() => {
              document.getElementById(`memory-${memoryId}`)?.scrollIntoView({
                behavior: "smooth",
                block: "center",
              });
            }, 0);
          }}
          onReply={(memory) => {
            setViewerMemoryId(null);
            setMessageText(memory.encryptedContent || memory.description || "");
            composerInputRef.current?.focus();
          }}
          onToggleFavorite={(memoryId, currentValue) =>
            void handleToggleFavorite(memoryId, currentValue)
          }
          onTogglePin={(memoryId, currentValue) =>
            void handleTogglePin(memoryId, currentValue)
          }
          onReact={(memoryId, emoji) =>
            void handleToggleReaction(memoryId, emoji)
          }
          onForward={(memoryId) => {
            setViewerMemoryId(null);
            setForwardMemoryId(memoryId);
          }}
        />
      )}

      {editingMemory && (
        <EditMemoryModal
          isOpen={true}
          initialContent={editingMemory.encryptedContent || ""}
          initialDate={
            editingMemory.memoryDate
              ? new Date(editingMemory.memoryDate).toISOString().split("T")[0]
              : new Date().toISOString().split("T")[0]
          }
          isSaving={isSavingEdit}
          onClose={() => setEditingMemoryId(null)}
          onSave={handleEditSave}
        />
      )}

      {forwardMemoryId !== null && (
        <ForwardMemoryModal
          memoryId={forwardMemoryId}
          isOpen={true}
          onClose={() => setForwardMemoryId(null)}
          onSuccess={(newMemory) => {
            if (
              newMemory.albumId &&
              Number(newMemory.albumId) === parsedAlbumId
            ) {
              void fetchMemories();
            }
            setForwardMemoryId(null);
          }}
        />
      )}
    </div>
  );
}
