"use client";

import { useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Camera, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import CropModal from "./CropModal";

type ProfileAvatarProps = {
  avatar: string | null;
  fullName: string;
  onAvatarChange: (avatar: string | null) => void;
  onStatus: (message: string, isError?: boolean) => void;
};

export function ProfileAvatar({
  avatar,
  fullName,
  onAvatarChange,
  onStatus,
}: ProfileAvatarProps) {
  const { update } = useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cropImage, setCropImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      onStatus("Only JPEG, PNG, and WebP images are allowed.", true);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setCropImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleCropConfirm = async (croppedBlob: Blob) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("avatar", croppedBlob, "avatar.jpg");
      const response = await fetch("/api/user/avatar", {
        method: "POST",
        body: formData,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(payload?.error || "Avatar upload failed");
      const nextAvatar = payload?.data?.avatar
        ? `/api/user/avatar?v=${Date.now()}`
        : null;
      onAvatarChange(nextAvatar);
      await update?.({ image: nextAvatar || undefined });
      onStatus("Profile photo updated.");
      setCropImage(null);
    } catch (error) {
      onStatus(
        error instanceof Error ? error.message : "Avatar upload failed",
        true,
      );
    } finally {
      setIsUploading(false);
    }
  };

  const removeAvatar = async () => {
    if (!avatar) return;
    setIsUploading(true);
    try {
      const response = await fetch("/api/user/avatar", { method: "DELETE" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(payload?.error || "Avatar removal failed");
      onAvatarChange(null);
      await update?.({ image: undefined });
      onStatus("Profile photo removed.");
    } catch (error) {
      onStatus(
        error instanceof Error ? error.message : "Avatar removal failed",
        true,
      );
    } finally {
      setIsUploading(false);
      setShowRemoveDialog(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-4">
        <button
          type="button"
          className="group relative rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          aria-label="Change profile photo"
        >
          <Avatar className="size-20">
            <AvatarImage src={avatar || undefined} alt="Profile photo" />
            <AvatarFallback className="bg-emerald-100 text-xl text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
              {(fullName || "U").slice(0, 1).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/45 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
            {isUploading ? (
              <Loader2 className="size-6 animate-spin text-white" />
            ) : (
              <Camera className="size-6 text-white" />
            )}
          </span>
        </button>
        <div>
          <p className="text-sm font-medium text-foreground">Profile photo</p>
          <p className="text-xs text-muted-foreground">
            Tap to change or remove
          </p>
          {avatar && (
            <button
              type="button"
              onClick={() => setShowRemoveDialog(true)}
              disabled={isUploading}
              className="mt-1 text-xs font-medium text-red-600 hover:underline"
            >
              Remove photo
            </button>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={handleFileSelect}
          disabled={isUploading}
        />
      </div>
      {cropImage && (
        <CropModal
          imageSrc={cropImage}
          onClose={() => setCropImage(null)}
          onConfirm={handleCropConfirm}
        />
      )}
      <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove profile photo?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove your current profile photo. You can upload a new
              one anytime.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUploading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={removeAvatar} disabled={isUploading}>
              {isUploading ? "Removing..." : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
