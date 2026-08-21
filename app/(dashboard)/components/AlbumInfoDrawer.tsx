"use client";

import { useEffect, useRef, useState } from "react";
import { Archive, Camera, FileText, Image, Lock, Pencil, Plus, Trash2, Video, Volume2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import EditAlbumModal from "./EditAlbumModal";
import ShareAlbumModal from "./ShareAlbumModal";
import type { Album, Memory } from "@/app/types";

type AlbumDetails = Album & {
  collaborators?: Array<{ id: number; email: string; fullName?: string | null; permission: string }>;
  stats?: { total: number; photos: number; videos: number; audio: number };
};

interface AlbumInfoDrawerProps {
  album: Album | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenChange: (open: boolean) => void;
  onAlbumUpdated: (album: Album) => void;
  onPasscodeLock: () => void;
}

const statItems = [
  { key: "total", label: "Memories", icon: FileText },
  { key: "photos", label: "Photos", icon: Image },
  { key: "videos", label: "Videos", icon: Video },
  { key: "audio", label: "Audio", icon: Volume2 },
] as const;

export default function AlbumInfoDrawer({ album, isOpen, onClose, onOpenChange, onAlbumUpdated, onPasscodeLock }: AlbumInfoDrawerProps) {
  const [details, setDetails] = useState<AlbumDetails | null>(null);
  const [media, setMedia] = useState<Memory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const isClosingRef = useRef(false);
  const pendingActionRef = useRef<(() => void) | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isOpen || !album) return;
    let active = true;
    setIsLoading(true);
    Promise.all([fetch(`/api/albums/${album.id}`).then((response) => response.json()), fetch(`/api/albums/${album.id}/memories?limit=6&type=photo,video`).then((response) => response.json())]).then(([albumResponse, mediaResponse]) => {
      if (!active) return;
      setDetails(albumResponse?.data ?? album);
      setMedia(Array.isArray(mediaResponse?.data) ? mediaResponse.data : []);
    }).catch(() => { if (active) setDetails(album); }).finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [album, isOpen]);

  useEffect(() => () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
    }
  }, []);

  if (!album) return null;
  const shownAlbum = details ?? album;
  const stats = details?.stats ?? { total: shownAlbum.memoryCount ?? 0, photos: 0, videos: 0, audio: 0 };
  const canManage = shownAlbum.role === "owner" || shownAlbum.permission === "admin" || shownAlbum.permission === "edit";
  const coverUrl = shownAlbum.coverPhoto ? `/api/album/cover/${shownAlbum.id}` : undefined;
  const finishActionClose = () => {
    if (!isClosingRef.current) return;
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    const action = pendingActionRef.current;
    pendingActionRef.current = null;
    isClosingRef.current = false;
    setIsClosing(false);
    onClose();
    action?.();
  };

  const closeBefore = (action: () => void) => {
    if (isClosingRef.current) return;
    pendingActionRef.current = action;
    isClosingRef.current = true;
    setIsClosing(true);
    closeTimerRef.current = setTimeout(finishActionClose, 300);
  };

  const handleArchive = async () => {
    closeBefore(() => {
      void (async () => {
        if (!window.confirm(`Archive "${shownAlbum.name}"?`)) return;
        const response = await fetch(`/api/albums/${shownAlbum.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isArchived: true }),
        });
        if (!response.ok) return window.alert("Unable to archive this album.");
        onAlbumUpdated({ ...shownAlbum, isArchived: true });
      })();
    });
  };

  const handleDelete = async () => {
    closeBefore(() => {
      void (async () => {
        if (!window.confirm(`Delete "${shownAlbum.name}"? This cannot be undone.`)) return;
        const response = await fetch(`/api/albums/${shownAlbum.id}`, { method: "DELETE" });
        if (!response.ok) return window.alert("Unable to delete this album.");
        onAlbumUpdated({ ...shownAlbum, isArchived: true });
      })();
    });
  };

  return (
    <>
    <Sheet open={isOpen && !isClosing} onOpenChange={(open) => { if (isClosing) return; if (!open) onClose(); onOpenChange(open); }}>
      <SheetContent side="right" onAnimationEnd={finishActionClose} className="overflow-y-auto border-border bg-background text-foreground sm:max-w-lg">
        <SheetHeader className="border-b border-border bg-card pb-4 pr-14 pt-5">
          <SheetTitle className="text-foreground">Album info</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 px-4 pb-8 pt-4 sm:px-5">
          <section className="flex flex-col items-center rounded-2xl border border-border bg-card px-5 py-7 text-center shadow-sm">
            <Avatar size="lg" className="mb-4 size-28 rounded-full border-4 border-card shadow-md after:rounded-full">
              <AvatarImage src={coverUrl} alt="" className="rounded-full" />
              <AvatarFallback className="rounded-full bg-linear-to-br from-emerald-100 to-emerald-200 text-4xl font-semibold text-emerald-800 dark:from-emerald-950 dark:to-emerald-900 dark:text-emerald-200">{shownAlbum.name.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold tracking-tight text-foreground">{shownAlbum.name}</h2>
              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">{shownAlbum.isPrivate ? "Private" : "Shared"}</span>
            </div>
            {shownAlbum.description && <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{shownAlbum.description}</p>}
          </section>

          <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {statItems.map(({ key, label, icon: Icon }) => (
              <div key={key} className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-3 shadow-sm sm:flex-col sm:justify-center sm:gap-1.5 sm:px-1 sm:text-center">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-emerald-700 dark:text-emerald-300"><Icon className="size-4" /></span>
                <span><strong className="block text-base font-bold text-foreground">{stats[key]}</strong><span className="block text-[11px] text-muted-foreground">{label}</span></span>
              </div>
            ))}
          </section>

          {canManage && <section className="flex gap-2 rounded-2xl border border-border bg-card p-3 shadow-sm"><Button variant="outline" size="sm" className="h-10 flex-1 border-border text-emerald-700 hover:bg-muted dark:text-emerald-300" onClick={() => closeBefore(() => setIsEditing(true))}><Pencil />Edit</Button><Button variant="outline" size="sm" className="h-10 flex-1 border-border text-muted-foreground hover:bg-muted" onClick={handleArchive}><Archive />Archive</Button><Button variant="destructive" size="sm" className="h-10 flex-1" onClick={handleDelete}><Trash2 />Delete</Button></section>}

          <section className="rounded-2xl border border-border bg-card shadow-sm">
            <div className="flex items-center justify-between gap-3 px-4 py-4"><div><h3 className="text-base font-semibold text-foreground">Collaborators</h3><p className="mt-0.5 text-xs text-muted-foreground">People with access to this album</p></div><Button size="sm" className="bg-emerald-700 text-white hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500" onClick={() => closeBefore(() => setIsSharing(true))}><Plus />Add people</Button></div>
            <Separator className="bg-border" />
            <div className="p-4">{isLoading ? <p className="text-sm text-muted-foreground">Loading collaborators...</p> : shownAlbum.collaborators?.length ? <div className="space-y-1">{shownAlbum.collaborators.map((collaborator) => <div key={collaborator.id} className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-muted"><Avatar size="sm" className="size-9"><AvatarFallback className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">{(collaborator.fullName || collaborator.email).charAt(0).toUpperCase()}</AvatarFallback></Avatar><div className="min-w-0"><p className="truncate text-sm font-medium text-foreground">{collaborator.fullName || collaborator.email}</p><p className="truncate text-xs text-muted-foreground">{collaborator.email}</p></div></div>)}</div> : <p className="text-sm text-muted-foreground">You are the only collaborator.</p>}</div>
          </section>

          <section className="rounded-2xl border border-border bg-card p-4 shadow-sm"><div className="mb-3 flex items-center justify-between"><div><h3 className="text-base font-semibold text-foreground">Media</h3><p className="mt-0.5 text-xs text-muted-foreground">Recent photos and videos</p></div><span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">{media.length} items</span></div>{media.length ? <div className="grid grid-cols-3 gap-1.5">{media.map((memory) => <div key={memory.id} className="relative aspect-square overflow-hidden rounded-lg bg-muted">{(memory.thumbnailPath || memory.encryptedFilePath) ? <img src={`/api/media/${encodeURIComponent(memory.thumbnailPath || memory.encryptedFilePath || "")}`} alt="" className="size-full object-cover" /> : <div className="flex size-full items-center justify-center"><Camera className="size-5 text-muted-foreground" /></div>}{memory.memoryType === "video" && <span className="absolute bottom-1.5 right-1.5 flex size-6 items-center justify-center rounded-full bg-black/55 text-white"><Video className="size-3.5" /></span>}</div>)}</div> : <div className="rounded-xl bg-muted px-4 py-8 text-center"><Camera className="mx-auto mb-2 size-6 text-muted-foreground" /><p className="text-sm text-muted-foreground">No photos or videos yet.</p></div>}</section>

          <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"><button type="button" className="flex w-full items-center gap-3 px-4 py-4 text-left hover:bg-muted" onClick={() => closeBefore(() => setIsEditing(true))}><span className="flex size-9 items-center justify-center rounded-full bg-muted text-emerald-700 dark:text-emerald-300"><Lock className="size-4" /></span><span><span className="block text-sm font-medium text-foreground">Privacy</span><span className="block text-xs text-muted-foreground">{shownAlbum.isPrivate ? "Private album" : "Shared album"}</span></span></button><Separator className="bg-border" /><button type="button" className="flex w-full items-center gap-3 px-4 py-4 text-left hover:bg-muted" onClick={() => closeBefore(onPasscodeLock)}><span className="flex size-9 items-center justify-center rounded-full bg-muted text-emerald-700 dark:text-emerald-300"><Lock className="size-4" /></span><span><span className="block text-sm font-medium text-foreground">Passcode lock</span><span className="block text-xs text-muted-foreground">{shownAlbum.isLocked ? "Enabled" : "Not enabled"}</span></span></button></section>
        </div>
      </SheetContent>
    </Sheet>
    <EditAlbumModal isOpen={isEditing} album={shownAlbum} onClose={() => setIsEditing(false)} onUpdate={(updatedAlbum) => { onAlbumUpdated(updatedAlbum); setDetails((current) => current ? { ...current, ...updatedAlbum } : updatedAlbum); setIsEditing(false); }} />
    <ShareAlbumModal isOpen={isSharing} album={shownAlbum} onClose={() => setIsSharing(false)} />
  </>);
}