"use client";

import { useEffect, useState } from "react";
import type { Album } from "@/app/types";

interface LockAlbumModalProps {
  isOpen: boolean;
  album: Album | null;
  onClose: () => void;
  onSuccess: (album: Album) => void;
}

const timeoutOptions = [
  { value: 5, label: "5 minutes" },
  { value: 30, label: "30 minutes" },
  { value: 60, label: "1 hour" },
  { value: 720, label: "12 hours" },
  { value: 0, label: "Until browser closes" },
];

export default function LockAlbumModal({
  isOpen,
  album,
  onClose,
  onSuccess,
}: LockAlbumModalProps) {
  const [passcode, setPasscode] = useState("");
  const [confirmPasscode, setConfirmPasscode] = useState("");
  const [timeout, setTimeout] = useState(5);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen || !album) {
      return;
    }

    setPasscode("");
    setConfirmPasscode("");
    setTimeout(album.passcodeTimeout ?? 5);
  }, [isOpen, album]);

  if (!isOpen || !album) {
    return null;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!passcode.trim()) {
      window.alert("Please enter a passcode.");
      return;
    }

    if (passcode !== confirmPasscode) {
      window.alert("Passcodes do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/albums/${album.id}/lock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          passcode,
          timeout,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.error || "Failed to update album lock");
      }

      onSuccess({
        ...album,
        passcodeTimeout: timeout,
        isLocked: true,
      });
      onClose();
    } catch (error) {
      console.error("Error saving passcode:", error);
      window.alert(
        error instanceof Error ? error.message : "Unable to save album passcode"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemovePasscode = async () => {
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/albums/${album.id}/lock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode: "" }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.error || "Failed to remove passcode");
      }

      onSuccess({
        ...album,
        passcodeTimeout: 5,
        isLocked: false,
      });
      onClose();
    } catch (error) {
      console.error("Error removing passcode:", error);
      window.alert(
        error instanceof Error ? error.message : "Unable to remove album passcode"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            {album.isLocked ? "Change Passcode" : "Lock Album"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Passcode
            </label>
            <input
              type="password"
              value={passcode}
              onChange={(event) => setPasscode(event.target.value)}
              placeholder="Enter passcode"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Confirm Passcode
            </label>
            <input
              type="password"
              value={confirmPasscode}
              onChange={(event) => setConfirmPasscode(event.target.value)}
              placeholder="Confirm passcode"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Timeout
            </label>
            <select
              value={timeout}
              onChange={(event) => setTimeout(Number(event.target.value))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {timeoutOptions.map((option) => (
                <option key={option.label} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? "Saving..." : album.isLocked ? "Update Lock" : "Save Lock"}
            </button>
            {album.isLocked && (
              <button
                type="button"
                onClick={handleRemovePasscode}
                disabled={isSubmitting}
                className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50"
              >
                Remove
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
