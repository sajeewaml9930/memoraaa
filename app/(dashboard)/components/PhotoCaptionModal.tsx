"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

interface PhotoCaptionModalProps {
  file: File | null;
  isUploading?: boolean;
  uploadProgress?: number;
  onCancel: () => void;
  onUpload: (payload: { caption: string; keepOriginalQuality: boolean }) => Promise<void> | void;
}

export default function PhotoCaptionModal({
  file,
  isUploading = false,
  uploadProgress = 0,
  onCancel,
  onUpload,
}: PhotoCaptionModalProps) {
  const [caption, setCaption] = useState("");
  const [keepOriginalQuality, setKeepOriginalQuality] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>("");

  useEffect(() => {
    if (!file) {
      setPreviewUrl("");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  const remainingCharacters = useMemo(() => 200 - caption.length, [caption.length]);

  const handleSubmit = async () => {
    if (!file) {
      return;
    }

    await onUpload({ caption: caption.trim(), keepOriginalQuality });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onCancel}>
      <div
        className="w-full max-w-lg rounded-2xl bg-white p-4 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800">Send photo</h3>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full px-2 py-1 text-sm text-gray-500 hover:bg-gray-100"
          >
            Cancel
          </button>
        </div>

        {previewUrl ? (
          <div className="mb-4 overflow-hidden rounded-xl border border-gray-200 bg-gray-100">
            <img src={previewUrl} alt="Selected preview" className="h-64 w-full object-cover" />
          </div>
        ) : (
          <div className="mb-4 flex h-64 items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 text-gray-400">
            No image selected
          </div>
        )}

        <div className="mb-4">
          <label htmlFor="photo-caption" className="mb-2 block text-sm font-medium text-gray-700">
            Caption
          </label>
          <textarea
            id="photo-caption"
            value={caption}
            maxLength={200}
            onChange={(event) => setCaption(event.target.value.slice(0, 200))}
            placeholder="Add a caption..."
            className="min-h-[88px] w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
          <div className="mt-1 text-right text-xs text-gray-500">{remainingCharacters} characters left</div>
        </div>

        <label className="mb-5 flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={keepOriginalQuality}
            onChange={(event) => setKeepOriginalQuality(event.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          Keep original quality (no compression)
        </label>

        {isUploading && (
          <div className="mb-4">
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

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isUploading}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!file || isUploading}
            className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            {isUploading ? "Uploading..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
