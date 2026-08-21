"use client";

import { useEffect, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type CropModalProps = {
  imageSrc: string;
  onClose: () => void;
  onConfirm: (croppedBlob: Blob) => void | Promise<void>;
};

function createCroppedImage(imageSrc: string, crop: Area): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = crop.width;
      canvas.height = crop.height;
      const context = canvas.getContext("2d");
      if (!context) {
        reject(new Error("Unable to prepare the cropped image"));
        return;
      }
      context.drawImage(
        image,
        crop.x,
        crop.y,
        crop.width,
        crop.height,
        0,
        0,
        crop.width,
        crop.height,
      );
      canvas.toBlob(
        (blob) =>
          blob ? resolve(blob) : reject(new Error("Unable to crop image")),
        "image/jpeg",
        0.9,
      );
    };
    image.onerror = () => reject(new Error("Unable to load image"));
    image.src = imageSrc;
  });
}

export default function CropModal({
  imageSrc,
  onClose,
  onConfirm,
}: CropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isCropping, setIsCropping] = useState(false);

  useEffect(() => {
    if (!croppedAreaPixels) return;
    let currentUrl: string | null = null;
    void createCroppedImage(imageSrc, croppedAreaPixels).then((blob) => {
      currentUrl = URL.createObjectURL(blob);
      setPreviewUrl(currentUrl);
    });
    return () => {
      if (currentUrl) URL.revokeObjectURL(currentUrl);
    };
  }, [croppedAreaPixels, imageSrc]);

  const confirmCrop = async () => {
    if (!croppedAreaPixels) return;
    setIsCropping(true);
    try {
      await onConfirm(await createCroppedImage(imageSrc, croppedAreaPixels));
    } finally {
      setIsCropping(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !isCropping && onClose()}>
      <DialogContent className="max-w-2xl bg-white text-slate-900">
        <DialogHeader>
          <DialogTitle>Crop profile photo</DialogTitle>
          <DialogDescription>
            Move and zoom the photo to frame it in a square.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_130px]">
          <div className="relative h-[min(60vh,360px)] overflow-hidden rounded-xl bg-slate-950">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid
              onCropChange={setCrop}
              onCropComplete={(_, pixels) => setCroppedAreaPixels(pixels)}
              onZoomChange={setZoom}
            />
          </div>
          <div className="flex flex-col items-center gap-3">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Preview
            </span>
            <div className="size-28 overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200">
              {previewUrl && (
                <img
                  src={previewUrl}
                  alt="Cropped profile preview"
                  className="size-full object-cover"
                />
              )}
            </div>
            <label className="mt-2 w-full text-xs font-medium text-slate-600">
              Zoom
              <input
                type="range"
                min="1"
                max="3"
                step="0.05"
                value={zoom}
                onChange={(event) => setZoom(Number(event.target.value))}
                className="mt-2 w-full accent-emerald-600"
              />
            </label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isCropping}>
            Cancel
          </Button>
          <Button
            onClick={confirmCrop}
            disabled={!croppedAreaPixels || isCropping}
          >
            {isCropping ? "Processing..." : "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
