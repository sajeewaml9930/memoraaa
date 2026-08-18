"use client";

import { useEffect, useState } from "react";
import { Lock, Globe, X, Upload } from "lucide-react";
import type { Album } from "@/app/types";

interface EditAlbumModalProps {
  isOpen: boolean;
  album: Album | null;
  onClose: () => void;
  onUpdate: (updatedAlbum: Album) => void;
}

export default function EditAlbumModal({
  isOpen,
  album,
  onClose,
  onUpdate,
}: EditAlbumModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(true);
  const [coverPhoto, setCoverPhoto] = useState<File | null>(null);
  const [coverPhotoPreview, setCoverPhotoPreview] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && album) {
      setName(album.name);
      setDescription(album.description || "");
      setIsPrivate(album.isPrivate);
      setCoverPhoto(null);
      setCoverPhotoPreview(album.coverPhoto ? `/${album.coverPhoto}` : "");
      setError(null);
    }
  }, [isOpen, album]);

  const handleCoverPhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size
    if (file.size > 5 * 1024 * 1024) {
      setError("Cover photo must be 5MB or smaller");
      return;
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file");
      return;
    }

    setCoverPhoto(file);
    setError(null);

    // Create preview
    const reader = new FileReader();
    reader.onload = (event) => {
      setCoverPhotoPreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Album name is required");
      return;
    }

    if (name.trim().length > 100) {
      setError("Album name must be 100 characters or less");
      return;
    }

    if (description.length > 200) {
      setError("Description must be 200 characters or less");
      return;
    }

    if (!album) return;

    setIsSaving(true);

    try {
      // Check if any changes were made
      const hasNameChange = name !== album.name;
      const hasDescriptionChange = description !== (album.description || "");
      const hasPrivacyChange = isPrivate !== album.isPrivate;
      const hasCoverChange = coverPhoto !== null;

      if (!hasNameChange && !hasDescriptionChange && !hasPrivacyChange && !hasCoverChange) {
        onClose();
        return;
      }

      // Prepare form data
      const formData = new FormData();
      if (hasNameChange) formData.append("name", name);
      if (hasDescriptionChange) formData.append("description", description);
      if (hasPrivacyChange) formData.append("isPrivate", String(isPrivate));
      if (hasCoverChange && coverPhoto) {
        formData.append("coverPhoto", coverPhoto);
      }

      const response = await fetch(`/api/albums/${album.id}`, {
        method: "PATCH",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update album");
      }

      const result = await response.json();
      if (result.success && result.data) {
        onUpdate(result.data);
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update album");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen || !album) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Edit album</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={20} />
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 border border-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Album name */}
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">
              Album name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              placeholder="Enter album name..."
            />
            <p className="mt-1 text-xs text-gray-500">
              {name.length}/100 characters
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={200}
              rows={3}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              placeholder="Describe your album..."
            />
            <p className="mt-1 text-xs text-gray-500">
              {description.length}/200 characters
            </p>
          </div>

          {/* Cover photo */}
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">
              Cover photo
            </label>

            {/* Preview */}
            {coverPhotoPreview && (
              <div className="mb-3 relative group">
                <img
                  src={coverPhotoPreview}
                  alt="Cover photo preview"
                  className="w-full h-40 object-cover rounded-lg border border-gray-200"
                />
                <button
                  type="button"
                  onClick={() => {
                    setCoverPhoto(null);
                    setCoverPhotoPreview("");
                  }}
                  className="absolute top-2 right-2 bg-white/90 hover:bg-white p-1.5 rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition"
                >
                  <X size={16} className="text-gray-600" />
                </button>
              </div>
            )}

            {/* File input */}
            <label className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 border-dashed border-gray-200 hover:border-blue-400 hover:bg-blue-50 cursor-pointer transition">
              <Upload size={18} className="text-gray-400" />
              <span className="text-sm text-gray-600">
                {coverPhoto ? "Change photo" : "Upload new cover photo"}
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={handleCoverPhotoSelect}
                className="hidden"
              />
            </label>
            <p className="mt-1 text-xs text-gray-500">
              PNG, JPG, GIF or WebP (max 5MB)
            </p>
          </div>

          {/* Privacy toggle */}
          <div>
            <label className="block mb-3 text-sm font-medium text-gray-700">
              Privacy
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsPrivate(true)}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition ${
                  isPrivate
                    ? "border-blue-500 bg-blue-50 text-blue-600"
                    : "border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300"
                }`}
              >
                <Lock size={16} />
                <span className="text-sm font-medium">Private</span>
              </button>
              <button
                type="button"
                onClick={() => setIsPrivate(false)}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition ${
                  !isPrivate
                    ? "border-blue-500 bg-blue-50 text-blue-600"
                    : "border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300"
                }`}
              >
                <Globe size={16} />
                <span className="text-sm font-medium">Public</span>
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !name.trim()}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
            >
              {isSaving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
