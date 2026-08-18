"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { MoreHorizontal, Pencil, Paperclip, Send, Mic, Trash2, Heart, Pin, PinOff, Archive, ArchiveRestore, Share2, MapPin } from "lucide-react";
import EditMemoryModal from "./EditMemoryModal";
import ForwardMemoryModal from "./ForwardMemoryModal";
import ImageGalleryModal from "./ImageGalleryModal";
import PhotoCaptionModal from "./PhotoCaptionModal";
import VideoTrimmerModal from "./VideoTrimmerModal";
import AudioRecorderModal from "./AudioRecorderModal";
import ShareMemoryModal from "./ShareMemoryModal";
import dynamic from "next/dynamic";
import { useSocket } from "@/app/hooks/useSocket";
import { renderMentionSegments, serializeMention } from "@/app/lib/mentions";
import { MOOD_META, MOOD_OPTIONS, normalizeMood } from "@/app/lib/moods";
import type { Memory, MemoryReactionRecord } from "@/app/types";

const LocationPickerModal = dynamic(() => import("./LocationPickerModal"), {
  ssr: false,
});

export default function MemoryStream() {
  const { id: albumId } = useParams();
  const parsedAlbumId = albumId ? Number(albumId) : null;
  const socket = useSocket(parsedAlbumId);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const [memories, setMemories] = useState<Memory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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
  const [galleryMemoryId, setGalleryMemoryId] = useState<number | null>(null);
  const [forwardMemoryId, setForwardMemoryId] = useState<number | null>(null);
  const [pendingPhoto, setPendingPhoto] = useState<File | null>(null);
  const [pendingVideo, setPendingVideo] = useState<File | null>(null);
  const [isVoiceRecorderOpen, setIsVoiceRecorderOpen] = useState(false);
  const [shareMemoryId, setShareMemoryId] = useState<number | null>(null);
  const [canEditMemories, setCanEditMemories] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id: number | null; name?: string | null } | null>(null);
  const [typingUsers, setTypingUsers] = useState<Array<{ userId: number; userName: string }>>([]);
  const [mentionSuggestions, setMentionSuggestions] = useState<Array<{ id: number; username: string; fullName?: string | null; email?: string }>>([]);
  const [mentionQuery, setMentionQuery] = useState("");
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<{ location: string; latitude: number; longitude: number } | null>(null);
  const [isLocationPickerOpen, setIsLocationPickerOpen] = useState(false);
  const reactionOptions = ["👍", "🎉", "❤️", "😂", "😮"];
  const typingActiveRef = useRef(false);
  const typingStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingRepeatTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingRemovalTimersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const editingMemory = memories.find((memory) => memory.id === editingMemoryId) ?? null;

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
      return new Date(b.memoryDate).getTime() - new Date(a.memoryDate).getTime();
    });
  }, []);

  const fetchMemories = useCallback(async () => {
    if (!albumId) {
      return;
    }

    try {
      const response = await fetch(`/api/albums/${albumId}/memories`);
      const data = await response.json();
      setMemories(sortMemories(data.data || []));
    } catch (error) {
      console.error("Error fetching memories:", error);
    } finally {
      setIsLoading(false);
    }
  }, [albumId]);

  useEffect(() => {
    if (!albumId) {
      return;
    }

    fetchMemories();

    fetch(`/api/albums/${albumId}/collaborators`)
      .then((response) => response.json())
      .then((data) => {
        const nextOptions = Array.isArray(data?.data) ? data.data : [];
        setMentionSuggestions(nextOptions);
      })
      .catch(() => setMentionSuggestions([]));

    fetch(`/api/albums/${albumId}`)
      .then((response) => response.json())
      .then((data) => {
        const permission = data?.data?.permission ?? data?.permission;
        const role = data?.data?.role ?? data?.role;
        setCanEditMemories(
          role === "owner" || permission === "edit" || permission === "admin"
        );
      })
      .catch(() => setCanEditMemories(false));
  }, [albumId, fetchMemories]);

  useEffect(() => {
    let isMounted = true;

    fetch("/api/auth/session")
      .then((response) => response.json())
      .then((sessionData) => {
        if (!isMounted) {
          return;
        }

        const nextUserId = sessionData?.user?.id ? Number(sessionData.user.id) : null;
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
    if (!socket || !parsedAlbumId) {
      return;
    }

    const handleTyping = (payload: { albumId?: number; userId?: number; userName?: string }) => {
      if (payload.albumId !== parsedAlbumId || !payload.userId) {
        return;
      }

      const nextUserId = Number(payload.userId);
      if (currentUser && currentUser.id !== null && Number(currentUser.id) === nextUserId) {
        return;
      }

      const nextUserName = payload.userName || "Someone";
      setTypingUsers((currentTypingUsers) => {
        if (currentTypingUsers.some((typingUser) => Number(typingUser.userId) === nextUserId)) {
          return currentTypingUsers;
        }

        return [...currentTypingUsers, { userId: nextUserId, userName: nextUserName }];
      });

      const existingTimer = typingRemovalTimersRef.current.get(nextUserId);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      const removalTimer = setTimeout(() => {
        setTypingUsers((currentTypingUsers) =>
          currentTypingUsers.filter((typingUser) => Number(typingUser.userId) !== nextUserId)
        );
      }, 3000);

      typingRemovalTimersRef.current.set(nextUserId, removalTimer);
    };

    const handleStoppedTyping = (payload: { albumId?: number; userId?: number }) => {
      if (payload.albumId !== parsedAlbumId || !payload.userId) {
        return;
      }

      const nextUserId = Number(payload.userId);
      setTypingUsers((currentTypingUsers) =>
        currentTypingUsers.filter((typingUser) => Number(typingUser.userId) !== nextUserId)
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

    const handleMemoryUpdated = (payload: { albumId?: number; memory?: Memory }) => {
      const nextMemory = payload.memory;
      if (!nextMemory || payload.albumId !== parsedAlbumId) {
        return;
      }

      setMemories((currentMemories) =>
        sortMemories(
          currentMemories.map((memory) =>
            memory.id === nextMemory.id ? { ...memory, ...nextMemory } : memory
          )
        )
      );
    };

    const handleMemoryDeleted = (payload: { albumId?: number; memoryId?: number }) => {
      if (payload.albumId !== parsedAlbumId || !payload.memoryId) {
        return;
      }

      setMemories((currentMemories) =>
        currentMemories.filter((memory) => memory.id !== payload.memoryId)
      );
    };

    const handleNewMemory = (payload: { albumId?: number; memory?: Memory }) => {
      if (payload.albumId !== parsedAlbumId || !payload.memory) {
        return;
      }

      setMemories((currentMemories) => {
        if (currentMemories.some((memory) => memory.id === payload.memory!.id)) {
          return sortMemories(currentMemories);
        }

        return sortMemories([payload.memory!, ...currentMemories]);
      });
    };

    const handleMemoryPinned = (payload: { albumId?: number; memory?: Memory }) => {
      const nextMemory = payload.memory;
      if (!nextMemory || payload.albumId !== parsedAlbumId) {
        return;
      }

      setMemories((currentMemories) =>
        sortMemories(
          currentMemories.map((memory) =>
            memory.id === nextMemory.id ? { ...memory, ...nextMemory } : memory
          )
        )
      );
    };

    const handleReactionUpdated = (payload: { albumId?: number; memoryId?: number; reactions?: MemoryReactionRecord[] }) => {
      if (payload.albumId !== parsedAlbumId || !payload.memoryId) {
        return;
      }

      setMemories((currentMemories) =>
        currentMemories.map((memory) =>
          memory.id === payload.memoryId ? { ...memory, reactions: payload.reactions ?? memory.reactions ?? [] } : memory
        )
      );
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
  }, [socket, parsedAlbumId, sortMemories]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [memories]);

  const stopTyping = useCallback(() => {
    if (!socket || !parsedAlbumId || !currentUser?.id || !typingActiveRef.current) {
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
    [handleTypingStart, stopTyping]
  );

  const insertMention = useCallback((user: { id: number; username: string }) => {
    const mentionToken = serializeMention(user.id, user.username);
    const mentionMatcher = /(?:^|\s)@([^\s@]*)$/;
    const nextValue = messageText.replace(mentionMatcher, (match, query) => {
      const prefix = match.startsWith(" ") ? " " : "";
      return `${prefix}${mentionToken} `;
    });

    setMessageText(nextValue);
    setMentionQuery("");
    setTimeout(() => {
      const composerInput = document.querySelector<HTMLInputElement>("input[placeholder='Aa']");
      composerInput?.focus();
    }, 0);
  }, [messageText]);

  const handleSendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!messageText.trim() || !albumId) {
      return;
    }

    stopTyping();

    setIsSending(true);

    try {
      // POST to album-scoped memories endpoint. Use parsedAlbumId to ensure a numeric id is sent.
      const targetAlbumId = parsedAlbumId ?? (albumId ? Number(albumId) : null);
      if (!Number.isFinite(targetAlbumId)) {
        console.error("Invalid album id when sending message:", { albumId, parsedAlbumId, targetAlbumId });
        throw new Error("No valid album selected");
      }

      const response = await fetch(`/api/albums/${targetAlbumId}/memories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memoryType: "text",
          content: messageText,
          albumId: targetAlbumId,
          memoryDate: new Date().toISOString(),
          mood: selectedMood ?? null,
          location: selectedLocation?.location ?? null,
          latitude: selectedLocation?.latitude ?? null,
          longitude: selectedLocation?.longitude ?? null,
        }),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => null);
        throw new Error(text || `Failed to create memory: ${response.status}`);
      }

      // Success: clear input and refresh list
      setMessageText("");
      setSelectedMood(null);
      setSelectedLocation(null);
      await fetchMemories();
    } catch (error) {
      console.error("Error sending message:", error);
      if (error instanceof Error) {
        window.alert(`Failed to send message: ${error.message}`);
      } else {
        window.alert("Failed to send message");
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleFileSelection = async (event: React.ChangeEvent<HTMLInputElement>) => {
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

  const handlePhotoUpload = async (payload: { caption: string; keepOriginalQuality: boolean }) => {
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
      uploadFormData.append("keepOriginalQuality", String(payload.keepOriginalQuality));
      if (selectedMood) {
        uploadFormData.append("mood", selectedMood);
      }
      if (selectedLocation) {
        uploadFormData.append("location", selectedLocation.location);
        uploadFormData.append("latitude", String(selectedLocation.latitude));
        uploadFormData.append("longitude", String(selectedLocation.longitude));
      }

      const xhr = new XMLHttpRequest();

      xhr.upload.onprogress = (progressEvent) => {
        if (!progressEvent.lengthComputable) {
          return;
        }

        const percentage = Math.round((progressEvent.loaded / progressEvent.total) * 100);
        setUploadProgress(percentage);
      };

      xhr.onload = async () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          setPendingPhoto(null);
          setSelectedMood(null);
          setSelectedLocation(null);
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
      window.alert(error instanceof Error ? error.message : "Unable to upload photo");
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleVideoUpload = async (payload: { startTime: number; endTime: number }) => {
    if (!pendingVideo || !parsedAlbumId) {
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);

      const uploadFormData = new FormData();
      uploadFormData.append("file", pendingVideo);
      uploadFormData.append("albumId", String(parsedAlbumId));
      uploadFormData.append("caption", "");
      uploadFormData.append("keepOriginalQuality", "false");
      uploadFormData.append("startTime", String(payload.startTime));
      uploadFormData.append("endTime", String(payload.endTime));
      if (selectedMood) {
        uploadFormData.append("mood", selectedMood);
      }
      if (selectedLocation) {
        uploadFormData.append("location", selectedLocation.location);
        uploadFormData.append("latitude", String(selectedLocation.latitude));
        uploadFormData.append("longitude", String(selectedLocation.longitude));
      }

      const xhr = new XMLHttpRequest();

      xhr.upload.onprogress = (progressEvent) => {
        if (!progressEvent.lengthComputable) {
          return;
        }

        const percentage = Math.round((progressEvent.loaded / progressEvent.total) * 100);
        setUploadProgress(percentage);
      };

      xhr.onload = async () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          setPendingVideo(null);
          setSelectedMood(null);
          setSelectedLocation(null);
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
      window.alert(error instanceof Error ? error.message : "Unable to upload video");
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
      if (selectedMood) {
        uploadFormData.append("mood", selectedMood);
      }
      if (selectedLocation) {
        uploadFormData.append("location", selectedLocation.location);
        uploadFormData.append("latitude", String(selectedLocation.latitude));
        uploadFormData.append("longitude", String(selectedLocation.longitude));
      }

      const xhr = new XMLHttpRequest();

      xhr.upload.onprogress = (progressEvent) => {
        if (!progressEvent.lengthComputable) {
          return;
        }

        const percentage = Math.round((progressEvent.loaded / progressEvent.total) * 100);
        setUploadProgress(percentage);
      };

      xhr.onload = async () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          setSelectedMood(null);
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
      window.alert(error instanceof Error ? error.message : "Unable to upload voice message");
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleEditSave = async (payload: { content: string; memoryDate: string }) => {
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
          memory.id === updatedMemory.id ? { ...memory, ...updatedMemory } : memory
        )
      );

      socket?.emit("memory_updated", {
        albumId: parsedAlbumId,
        memory: updatedMemory,
      });

      setEditingMemoryId(null);
    } catch (error) {
      console.error("Error updating memory:", error);
      window.alert(error instanceof Error ? error.message : "Unable to update memory");
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
        currentMemories.filter((memory) => memory.id !== memoryId)
      );

      socket?.emit("memory_deleted", {
        albumId: parsedAlbumId,
        memoryId,
      });
    } catch (error) {
      console.error("Error deleting memory:", error);
      window.alert(error instanceof Error ? error.message : "Unable to delete memory");
    } finally {
      setIsDeletingId(null);
      setMenuOpenId(null);
    }
  };

  const handleToggleFavorite = async (memoryId: number, currentValue: boolean) => {
    if (!parsedAlbumId) {
      return;
    }

    const nextValue = !currentValue;
    const previousValue = currentValue;

    setMemories((currentMemories) =>
      currentMemories.map((memory) =>
        memory.id === memoryId ? { ...memory, isFavorite: nextValue } : memory
      )
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
          memory.id === updatedMemory.id ? { ...memory, ...updatedMemory } : memory
        )
      );

      socket?.emit("memory_updated", {
        albumId: parsedAlbumId,
        memory: updatedMemory,
      });
    } catch (error) {
      console.error("Error toggling favorite:", error);
      setMemories((currentMemories) =>
        currentMemories.map((memory) =>
          memory.id === memoryId ? { ...memory, isFavorite: previousValue } : memory
        )
      );
      window.alert(error instanceof Error ? error.message : "Unable to update favorite status");
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
          memory.id === memoryId ? { ...memory, isPinned: nextValue, pinnedAt: nextValue ? new Date().toISOString() : null } : memory
        )
      )
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
            memory.id === updatedMemory.id ? { ...memory, ...updatedMemory } : memory
          )
        )
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
            memory.id === memoryId ? { ...memory, isPinned: previousValue, pinnedAt: previousValue ? memory.pinnedAt ?? new Date().toISOString() : null } : memory
          )
        )
      );
      window.alert(error instanceof Error ? error.message : "Unable to update pin status");
    }
  };

  const handleToggleArchive = async (memoryId: number, currentValue: boolean) => {
    if (!parsedAlbumId) {
      return;
    }

    const nextValue = !currentValue;
    const previousValue = currentValue;

    setMemories((currentMemories) =>
      currentMemories.map((memory) =>
        memory.id === memoryId ? { ...memory, isArchived: nextValue } : memory
      )
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
          memory.id === updatedMemory.id ? { ...memory, ...updatedMemory } : memory
        )
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
          memory.id === memoryId ? { ...memory, isArchived: previousValue } : memory
        )
      );
      window.alert(error instanceof Error ? error.message : "Unable to update archive status");
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

      const nextReactions = (data?.data?.reactions ?? []) as MemoryReactionRecord[];
      setMemories((currentMemories) =>
        currentMemories.map((memory) =>
          memory.id === memoryId ? { ...memory, reactions: nextReactions } : memory
        )
      );

      socket?.emit("reaction_updated", {
        albumId: parsedAlbumId,
        memoryId,
        reactions: nextReactions,
      });
    } catch (error) {
      console.error("Error toggling reaction:", error);
      window.alert(error instanceof Error ? error.message : "Unable to update reaction");
    }
  };

  if (!albumId) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-gray-50">
        <p className="text-gray-500">Select an album to view memories</p>
      </div>
    );
  }

  const photoMemories = memories.filter((memory) => memory.memoryType === "photo");
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

  return (
    <div className="flex flex-1 flex-col bg-white">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setShowArchivedOnly((current) => !current)}
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition ${
              showArchivedOnly
                ? "border-amber-200 bg-amber-50 text-amber-700"
                : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            {showArchivedOnly ? <ArchiveRestore size={14} /> : <Archive size={14} />}
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
            <Heart size={14} className={showFavoritesOnly ? "fill-current text-pink-500" : "text-gray-500"} />
            Favorites only
          </button>
        </div>

        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-gray-500">Loading memories...</p>
          </div>
        ) : visibleMemories.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-gray-500">
              {showFavoritesOnly ? "No favorite memories yet." : "No memories yet. Create one!"}
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
            {[pinnedMemories, unpinnedMemories].map((group, groupIndex) =>
              group.length === 0 ? null : (
                <div key={groupIndex} className="space-y-4">
                  {group.map((memory) => {
                    const imageSrc =
                      (memory.memoryType === "photo" || memory.memoryType === "video") &&
                      (memory.thumbnailPath || memory.encryptedFilePath)
                        ? `/api/media/${encodeURIComponent(memory.thumbnailPath || memory.encryptedFilePath || "")}`
                        : "";

                    const videoSrc =
                      memory.memoryType === "video" && memory.encryptedFilePath
                        ? `/api/media/${encodeURIComponent(memory.encryptedFilePath)}`
                        : "";

                    const audioSrc =
                      (memory.memoryType === "voice" || memory.memoryType === "audio") && memory.encryptedFilePath
                        ? `/api/media/${encodeURIComponent(memory.encryptedFilePath)}`
                        : "";

                    const mentionSegments = memory.memoryType === "text" ? renderMentionSegments(memory.encryptedContent || "") : [];
                    const reactionCounts = (memory.reactions ?? []).reduce<Record<string, number>>((counts, reaction) => {
                      counts[reaction.emoji] = (counts[reaction.emoji] ?? 0) + 1;
                      return counts;
                    }, {});
                    const currentUserReaction = currentUser?.id
                      ? (memory.reactions ?? []).find((reaction) => reaction.userId === currentUser.id)?.emoji ?? null
                      : null;
                    const moodInfo = normalizeMood(memory.mood);

                    return (
                      <div key={memory.id} className="flex justify-end">
                        <div className="relative max-w-md">
                  {memory.memoryType === "photo" ? (
                    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                      <button
                        type="button"
                        onClick={() => setGalleryMemoryId(memory.id)}
                        className="block w-full text-left"
                        aria-label="Open photo gallery"
                      >
                        {imageSrc ? (
                          <img
                            src={imageSrc}
                            alt="Uploaded memory"
                            className="h-64 w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-64 w-full items-center justify-center bg-gray-100 text-sm text-gray-500">
                            Photo unavailable
                          </div>
                        )}
                      </button>
                      <div className="flex items-center justify-between gap-3 bg-white px-3 py-2 text-xs text-gray-500">
                        <span className="inline-flex items-center gap-1">
                          {moodInfo ? (
                            <>
                              <span>{MOOD_META[moodInfo].emoji}</span>
                              <span>{MOOD_META[moodInfo].label}</span>
                            </>
                          ) : null}
                          <span>{new Date(memory.memoryDate || memory.createdAt).toLocaleDateString()}</span>
                        </span>
                        <span>
                          {new Date(memory.createdAt).toLocaleTimeString([], {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      {memory.description && (
                        <div className="bg-white px-3 pb-2 text-sm text-gray-700">{memory.description}</div>
                      )}
                    </div>
                  ) : memory.memoryType === "video" ? (
                    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                      <div className="relative">
                        {videoSrc ? (
                          <video
                            src={videoSrc}
                            controls
                            poster={imageSrc}
                            className="h-72 w-full bg-black object-cover"
                          />
                        ) : (
                          <div className="flex h-72 w-full items-center justify-center bg-gray-100 text-sm text-gray-500">
                            Video unavailable
                          </div>
                        )}
                        {typeof memory.duration === "number" && memory.duration > 0 && (
                          <span className="absolute bottom-2 right-2 rounded-full bg-black/70 px-2 py-1 text-[10px] font-medium text-white">
                            {new Date(memory.duration * 1000).toISOString().slice(14, 19)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-3 bg-white px-3 py-2 text-xs text-gray-500">
                        <span className="inline-flex items-center gap-1">
                          {moodInfo ? (
                            <>
                              <span>{MOOD_META[moodInfo].emoji}</span>
                              <span>{MOOD_META[moodInfo].label}</span>
                            </>
                          ) : null}
                          <span>{new Date(memory.memoryDate || memory.createdAt).toLocaleDateString()}</span>
                        </span>
                        <span>
                          {new Date(memory.createdAt).toLocaleTimeString([], {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      {memory.description && (
                        <div className="bg-white px-3 pb-2 text-sm text-gray-700">{memory.description}</div>
                      )}
                    </div>
                  ) : (memory.memoryType === "voice" || memory.memoryType === "audio") ? (
                    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                      <div className="bg-gray-50 px-4 py-3">
                        <div className="mb-3 flex items-center justify-between text-xs text-gray-500">
                          <span className="inline-flex items-center gap-2 font-medium text-gray-600">
                            <Mic size={14} className="text-blue-600" />
                            Voice note
                          </span>
                          {typeof memory.duration === "number" && memory.duration > 0 && (
                            <span>{new Date(memory.duration * 1000).toISOString().slice(14, 19)}</span>
                          )}
                        </div>

                        <div className="mb-3 flex h-12 items-center rounded-xl border border-gray-200 bg-white px-2">
                          <div className="flex h-10 w-full items-end gap-1">
                            {Array.from({ length: 28 }).map((_, index) => (
                              <span
                                key={index}
                                className="w-1.5 rounded-full bg-blue-400/80"
                                style={{ height: `${20 + ((index * 13) % 55)}%` }}
                              />
                            ))}
                          </div>
                        </div>

                        {audioSrc ? (
                          <audio controls src={audioSrc} className="w-full" />
                        ) : (
                          <div className="flex h-12 items-center justify-center rounded-xl bg-gray-100 text-sm text-gray-500">
                            Voice message unavailable
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-3 bg-white px-3 py-2 text-xs text-gray-500">
                        <span className="inline-flex items-center gap-1">
                          {moodInfo ? (
                            <>
                              <span>{MOOD_META[moodInfo].emoji}</span>
                              <span>{MOOD_META[moodInfo].label}</span>
                            </>
                          ) : null}
                          <span>{new Date(memory.memoryDate || memory.createdAt).toLocaleDateString()}</span>
                        </span>
                        <span>
                          {new Date(memory.createdAt).toLocaleTimeString([], {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      {memory.description && (
                        <div className="bg-white px-3 pb-2 text-sm text-gray-700">{memory.description}</div>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-lg bg-blue-500 px-4 py-2 text-white">
                      <p className="whitespace-pre-wrap break-all">
                        {mentionSegments.length > 0 ? (
                          mentionSegments.map((segment, index) =>
                            segment.type === "mention" ? (
                              <span
                                key={`${segment.userId ?? index}-${index}`}
                                className="rounded bg-white/20 px-1 py-0.5 font-semibold text-blue-100"
                              >
                                {segment.value}
                              </span>
                            ) : (
                              <span key={`text-${index}`}>{segment.value}</span>
                            )
                          )
                        ) : (
                          memory.encryptedContent
                        )}
                      </p>
                      <div className="mt-2 flex items-center justify-between gap-3">
                        <span className="inline-flex items-center gap-1 text-xs text-blue-100">
                          {moodInfo ? (
                            <>
                              <span>{MOOD_META[moodInfo].emoji}</span>
                              <span>{MOOD_META[moodInfo].label}</span>
                            </>
                          ) : null}
                          {memory.location && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-medium text-blue-50">
                              📍 {memory.location.slice(0, 24)}{memory.location.length > 24 ? "…" : ""}
                            </span>
                          )}
                          <span>{new Date(memory.memoryDate || memory.createdAt).toLocaleDateString()}</span>
                        </span>
                        <span className="text-[10px] text-blue-100">
                          {new Date(memory.createdAt).toLocaleTimeString([], {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {reactionOptions.map((emoji) => {
                      const count = reactionCounts[emoji] ?? 0;
                      const isSelected = currentUserReaction === emoji;

                      return (
                        <button
                          key={`${memory.id}-${emoji}`}
                          type="button"
                          onClick={() => void handleToggleReaction(memory.id, emoji)}
                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-medium transition ${
                            isSelected
                              ? "border-blue-200 bg-blue-50 text-blue-700"
                              : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                          }`}
                          title={`React with ${emoji}`}
                        >
                          <span>{emoji}</span>
                          <span>{count}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="absolute -right-2 -top-2 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => void handleTogglePin(memory.id, Boolean(memory.isPinned))}
                      disabled={!canEditMemories}
                      className={`rounded-full border bg-white p-1.5 shadow-sm transition ${
                        memory.isPinned
                          ? "border-amber-200 bg-amber-50 text-amber-600"
                          : "border-gray-200 text-gray-500 hover:bg-gray-50"
                      } ${!canEditMemories ? "cursor-not-allowed opacity-50" : ""}`}
                      aria-label={memory.isPinned ? "Unpin memory" : "Pin memory"}
                      title={memory.isPinned ? "Unpin memory" : "Pin memory"}
                    >
                      {memory.isPinned ? <Pin size={14} className="fill-current" /> : <PinOff size={14} />}
                    </button>

                    <button
                      type="button"
                      onClick={() => void handleToggleFavorite(memory.id, Boolean(memory.isFavorite))}
                      className={`rounded-full border bg-white p-1.5 shadow-sm transition ${
                        memory.isFavorite
                          ? "border-pink-200 bg-pink-50 text-pink-500"
                          : "border-gray-200 text-gray-500 hover:bg-gray-50"
                      }`}
                      aria-label={memory.isFavorite ? "Remove from favorites" : "Add to favorites"}
                      title={memory.isFavorite ? "Remove from favorites" : "Add to favorites"}
                    >
                      <Heart size={14} className={memory.isFavorite ? "fill-current text-pink-500" : "text-gray-500"} />
                    </button>

                    <button
                      type="button"
                      onClick={() => setMenuOpenId(menuOpenId === memory.id ? null : memory.id)}
                      className="rounded-full border border-blue-100 bg-white p-1.5 text-gray-600 shadow-sm hover:bg-gray-50"
                      aria-label="Memory actions"
                    >
                      <MoreHorizontal size={16} />
                    </button>

                    {menuOpenId === memory.id && (
                      <div className="absolute right-0 mt-2 w-40 rounded-lg border border-gray-200 bg-white p-1 shadow-lg">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingMemoryId(memory.id);
                            setMenuOpenId(null);
                          }}
                          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-100"
                        >
                          <Pencil size={14} />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleTogglePin(memory.id, Boolean(memory.isPinned))}
                          disabled={!canEditMemories}
                          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-amber-600 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {memory.isPinned ? <PinOff size={14} /> : <Pin size={14} className="fill-current" />}
                          {memory.isPinned ? "Unpin" : "Pin"}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleToggleArchive(memory.id, Boolean(memory.isArchived))}
                          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-amber-600 hover:bg-amber-50"
                        >
                          {memory.isArchived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
                          {memory.isArchived ? "Restore" : "Archive"}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleToggleFavorite(memory.id, Boolean(memory.isFavorite))}
                          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-pink-600 hover:bg-pink-50"
                        >
                          <Heart size={14} className={memory.isFavorite ? "fill-current" : ""} />
                          {memory.isFavorite ? "Unfavorite" : "Favorite"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setForwardMemoryId(memory.id);
                            setMenuOpenId(null);
                          }}
                          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-100"
                        >
                          <Send size={14} />
                          Forward
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShareMemoryId(memory.id);
                            setMenuOpenId(null);
                          }}
                          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-100"
                        >
                          <Share2 size={14} />
                          Get share link
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteMemory(memory.id)}
                          disabled={isDeletingId === memory.id}
                          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-red-600 hover:bg-red-50 disabled:opacity-60"
                        >
                          <Trash2 size={14} />
                          {isDeletingId === memory.id ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
                    );
                  })}
                </div>
              )
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-gray-200 p-4">
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
          <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-2 py-1">
            <span className="text-xs font-medium text-gray-600">Mood</span>
            <div className="flex flex-wrap items-center gap-1">
              {MOOD_OPTIONS.map((mood) => {
                const meta = MOOD_META[mood];
                const isSelected = selectedMood === mood;

                return (
                  <button
                    key={mood}
                    type="button"
                    onClick={() => setSelectedMood(isSelected ? null : mood)}
                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs transition ${
                      isSelected
                        ? "border-blue-200 bg-blue-100 text-blue-800"
                        : "border-transparent bg-transparent text-gray-600 hover:border-gray-200 hover:bg-white"
                    }`}
                    title={meta.label}
                    aria-label={`Set mood: ${meta.label}`}
                  >
                    <span>{meta.emoji}</span>
                    <span className="hidden sm:inline">{meta.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

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
            className={`rounded-full p-2 transition ${selectedLocation ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            title={selectedLocation ? `Location: ${selectedLocation.location}` : "Add location"}
            onClick={() => setIsLocationPickerOpen(true)}
            disabled={isUploading}
          >
            <MapPin size={20} />
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
            {selectedLocation && (
              <div className="mb-2 inline-flex max-w-full items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs text-blue-700">
                <MapPin size={12} />
                <span className="truncate">{selectedLocation.location}</span>
                <button
                  type="button"
                  onClick={() => setSelectedLocation(null)}
                  className="ml-1 text-blue-500 hover:text-blue-700"
                  aria-label="Remove selected location"
                >
                  ×
                </button>
              </div>
            )}
            <input
              type="text"
              placeholder="Aa"
              value={messageText}
              onChange={(event) => handleComposerInputChange(event.target.value)}
              onBlur={() => {
                stopTyping();
                setTimeout(() => setMentionQuery(""), 150);
              }}
              className="w-full rounded-full bg-gray-100 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {mentionQuery && (
              <div className="absolute bottom-full left-0 z-10 mb-2 max-h-40 w-full overflow-auto rounded-xl border border-gray-200 bg-white shadow-lg">
                {mentionSuggestions
                  .filter((user) => {
                    const searchTerm = mentionQuery.trim().toLowerCase();
                    if (!searchTerm) {
                      return true;
                    }
                    return [user.username, user.fullName, user.email].filter(Boolean).some((value) =>
                      String(value).toLowerCase().includes(searchTerm)
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
                        <div className="text-sm font-medium text-gray-800">@{user.username || user.email}</div>
                        {user.fullName && <div className="text-xs text-gray-500">{user.fullName}</div>}
                      </div>
                    </button>
                  ))}
                {mentionSuggestions.filter((user) => {
                  const searchTerm = mentionQuery.trim().toLowerCase();
                  if (!searchTerm) {
                    return true;
                  }
                  return [user.username, user.fullName, user.email].filter(Boolean).some((value) =>
                    String(value).toLowerCase().includes(searchTerm)
                  );
                }).length === 0 && (
                  <div className="px-3 py-2 text-sm text-gray-500">No matching collaborators</div>
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

      {galleryMemoryId !== null && (
        <ImageGalleryModal
          memories={photoMemories}
          initialIndex={Math.max(
            0,
            photoMemories.findIndex((memory) => memory.id === galleryMemoryId)
          )}
          onClose={() => setGalleryMemoryId(null)}
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
            if (newMemory.albumId && Number(newMemory.albumId) === parsedAlbumId) {
              void fetchMemories();
            }
            setForwardMemoryId(null);
          }}
        />
      )}

      <LocationPickerModal
        isOpen={isLocationPickerOpen}
        onClose={() => setIsLocationPickerOpen(false)}
        onSelect={(location) => {
          setSelectedLocation(location);
          setIsLocationPickerOpen(false);
        }}
      />

      <ShareMemoryModal
        memoryId={shareMemoryId}
        isOpen={shareMemoryId !== null}
        onClose={() => setShareMemoryId(null)}
      />
    </div>
  );
}
