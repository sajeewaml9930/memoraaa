"use client";

import { ChangeEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const colors = [
  { name: "Mist", value: "#f8fafc" },
  { name: "Mint", value: "#d1fae5" },
  { name: "Sky", value: "#dbeafe" },
  { name: "Lavender", value: "#ede9fe" },
  { name: "Peach", value: "#ffedd5" },
  { name: "Teal", value: "#ccfbf1" },
  { name: "Ink", value: "#1e293b" },
  { name: "Plum", value: "#3b1f35" },
];

const patterns = [
  { name: "dots", label: "Dots" },
  { name: "stripes", label: "Stripes" },
  { name: "waves", label: "Waves" },
];

type Wallpaper = {
  wallpaperType: string;
  wallpaperValue: string | null;
  wallpaperImagePath: string | null;
};

const defaultWallpaper: Wallpaper = {
  wallpaperType: "default",
  wallpaperValue: null,
  wallpaperImagePath: null,
};

export function WallpaperSettings() {
  const [wallpaper, setWallpaper] = useState<Wallpaper>(defaultWallpaper);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/user/wallpaper")
      .then((response) => response.json())
      .then((data) => {
        if (data?.data) setWallpaper(data.data);
      })
      .catch(() => setError("Unable to load wallpaper settings."));
  }, []);

  const save = async (payload: {
    type: string;
    value?: string | null;
    imageBase64?: string;
  }) => {
    setIsSaving(true);
    setError("");
    setStatus("");
    try {
      const response = await fetch("/api/user/wallpaper", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(data.error || "Unable to save wallpaper");
      setWallpaper(data.data);
      setImagePreview(null);
      setStatus("Wallpaper updated.");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save wallpaper",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const uploadImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) {
      setError("Choose an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be 5MB or smaller.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const imageBase64 =
        typeof reader.result === "string" ? reader.result : "";
      setImagePreview(imageBase64);
      void save({ type: "image", imageBase64 });
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const previewStyle =
    wallpaper.wallpaperType === "solid"
      ? { backgroundColor: wallpaper.wallpaperValue ?? undefined }
      : wallpaper.wallpaperType === "image"
        ? {
            backgroundImage: "url(/api/user/wallpaper/image)",
            backgroundSize: "cover",
          }
        : {};
  const previewClass =
    wallpaper.wallpaperType === "pattern"
      ? `wallpaper-pattern-${wallpaper.wallpaperValue}`
      : "";

  return (
    <div className="space-y-6">
      <div
        className={`relative h-36 overflow-hidden rounded-xl border border-slate-200 ${previewClass}`}
        style={previewStyle}
      >
        <div className="absolute inset-0 bg-white/10" />
        <div className="absolute bottom-4 left-4 rounded-2xl rounded-bl-sm bg-white px-4 py-2 text-sm text-slate-700 shadow-sm">
          A little room for remembering.
        </div>
        <div className="absolute right-4 top-4 rounded-2xl rounded-tr-sm bg-emerald-500 px-4 py-2 text-sm text-white shadow-sm">
          Looks good
        </div>
      </div>

      <section>
        <h3 className="mb-3 text-sm font-semibold text-slate-800">
          Solid colors
        </h3>
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-8">
          {colors.map((color) => (
            <button
              key={color.value}
              type="button"
              title={color.name}
              aria-label={`Use ${color.name} wallpaper`}
              onClick={() => void save({ type: "solid", value: color.value })}
              disabled={isSaving}
              className={`aspect-square rounded-xl border-2 shadow-sm transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${wallpaper.wallpaperValue === color.value ? "border-blue-600 ring-2 ring-blue-200" : "border-white"}`}
              style={{ backgroundColor: color.value }}
            />
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold text-slate-800">Patterns</h3>
        <div className="grid grid-cols-3 gap-3">
          {patterns.map((pattern) => (
            <button
              key={pattern.name}
              type="button"
              onClick={() =>
                void save({ type: "pattern", value: pattern.name })
              }
              disabled={isSaving}
              className={`wallpaper-pattern-${pattern.name} h-16 rounded-xl border-2 text-xs font-medium text-slate-700 transition hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${wallpaper.wallpaperType === "pattern" && wallpaper.wallpaperValue === pattern.name ? "border-blue-600 ring-2 ring-blue-200" : "border-slate-200"}`}
            >
              {pattern.label}
            </button>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <label className="inline-flex cursor-pointer items-center rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
          Upload image
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={uploadImage}
            className="sr-only"
            disabled={isSaving}
          />
        </label>
        <Button
          variant="outline"
          onClick={() => void save({ type: "default" })}
          disabled={isSaving}
        >
          Reset to default
        </Button>
        {imagePreview && (
          <span className="text-xs text-slate-500">Uploading...</span>
        )}
      </div>
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      {status && (
        <p className="text-sm text-emerald-600" role="status">
          {status}
        </p>
      )}
    </div>
  );
}
