// Extended session type
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email?: string;
      name?: string;
      image?: string;
    };
  }

  interface User {
    id: string;
    email: string;
    name?: string;
    image?: string;
  }
}

// Memory types
export type MemoryType =
  | "text"
  | "photo"
  | "video"
  | "voice"
  | "audio"
  | "mixed";
export type MemoryStatus = "processing" | "ready" | "failed";
export type MoodType =
  | "happy"
  | "sad"
  | "neutral"
  | "excited"
  | "angry"
  | "anxious"
  | "grateful"
  | "tired"
  | "loved"
  | "hopeful"
  | "calm"
  | "nostalgic"
  | "reflective";

export interface MemoryReactionRecord {
  id: number;
  memoryId: number;
  userId: number;
  emoji: string;
  createdAt: Date | string;
}

export interface MemorySender {
  id: number;
  username: string;
  fullName?: string | null;
  avatar?: string | null;
}

export interface Memory {
  id: number;
  clientId?: string;
  memoryType: MemoryType;
  encryptedContent?: string;
  encryptedFilePath?: string;
  thumbnailPath?: string;
  duration?: number;
  title?: string;
  description?: string;
  mood?: MoodType;
  isFavorite: boolean;
  isPinned: boolean;
  pinnedAt?: Date | string | null;
  // albumId is sometimes returned by APIs (e.g., forward/create) to indicate the album owning the memory
  albumId?: number | null;
  isArchived: boolean;
  viewCount: number;
  memoryDate: Date;
  userId: number;
  forwardedFromId?: number;
  status: MemoryStatus;
  createdAt: Date;
  updatedAt: Date;
  reactions?: MemoryReactionRecord[];
  sender?: MemorySender;
}

export type AlbumPermission = "view" | "add" | "edit" | "admin";
export type AlbumRole = "owner" | "collaborator";

export interface Album {
  id: number;
  name: string;
  description?: string;
  coverPhoto?: string;
  isPrivate: boolean;
  isArchived: boolean;
  isPinned: boolean;
  pinnedAt?: Date | string | null;
  passcodeHash?: string | null;
  passcodeTimeout?: number | null;
  isLocked?: boolean;
  isMuted?: boolean;
  userId: number;
  permission?: AlbumPermission;
  role?: AlbumRole;
  // memoryCount is returned by some API endpoints for convenience
  memoryCount?: number;
  stats?: { total: number; photos: number; videos: number; audio: number };
  collaborators?: CollaboratorEntry[];
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: number;
  username: string;
  email: string;
  fullName?: string;
  bio?: string;
  avatar?: string;
  biometricEnabled: boolean;
  createdAt: Date;
  lastActive: Date;
}

export interface CollaboratorOption {
  id: number;
  username: string;
  fullName?: string | null;
  email?: string;
}

export interface CollaboratorEntry {
  id: number;
  email: string;
  fullName?: string | null;
  username?: string;
  permission: "view" | "add" | "edit" | "admin";
}

export interface NotificationItem {
  id: number;
  userId: number;
  type: string;
  message: string;
  memoryId?: number | null;
  read: boolean;
  createdAt: Date | string;
}

export interface Tag {
  id: number;
  name: string;
  isAuto: boolean;
  userId: number;
  createdAt: Date;
}

export interface SharedAlbum {
  id: number;
  albumId: number;
  userId: number;
  permission: AlbumPermission;
  accepted: boolean;
  invitedAt: Date;
  muted: boolean;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface AlbumWithMemories extends Album {
  memories: Memory[];
  unreadCount?: number;
  lastMemory?: Memory;
}

export interface MemoryWithTags extends Memory {
  tags: Tag[];
  album?: Album;
}

export type SocketEvent =
  | "join_room"
  | "leave_room"
  | "typing"
  | "stopped_typing"
  | "new_memory"
  | "memory_pinned"
  | "memory_archived"
  | "memory_updated"
  | "memory_deleted"
  | "unread_update"
  | "user_online"
  | "user_offline";

export interface SocketMessage {
  event: SocketEvent;
  data: any;
  timestamp: number;
}
