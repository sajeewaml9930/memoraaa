"use client";

import { useEffect, useState } from "react";
import { Copy, Link2, Shield, TimerReset, X } from "lucide-react";

interface ShareMemoryModalProps {
  isOpen: boolean;
  memoryId: number | null;
  onClose: () => void;
}

const expiryOptions = [
  { label: "Never", value: "never", hours: null },
  { label: "1 hour", value: "1", hours: 1 },
  { label: "1 day", value: "24", hours: 24 },
  { label: "7 days", value: "168", hours: 168 },
  { label: "30 days", value: "720", hours: 720 },
] as const;

export default function ShareMemoryModal({ isOpen, memoryId, onClose }: ShareMemoryModalProps) {
  const [expiresIn, setExpiresIn] = useState<string>("never");
  const [passwordProtect, setPasswordProtect] = useState(false);
  const [password, setPassword] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const [createdToken, setCreatedToken] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setShareUrl("");
      setCreatedToken("");
      setPassword("");
      setPasswordProtect(false);
      setExpiresIn("never");
      setError("");
      setCopied(false);
    }
  }, [isOpen]);

  if (!isOpen || memoryId === null) {
    return null;
  }

  const handleGenerateLink = async () => {
    try {
      setIsSubmitting(true);
      setError("");

      const body: Record<string, unknown> = {};
      const selectedOption = expiryOptions.find((option) => option.value === expiresIn);
      if (selectedOption && selectedOption.hours !== null) {
        body.expiresIn = selectedOption.hours;
      }
      if (passwordProtect && password.trim()) {
        body.password = password.trim();
      }

      const response = await fetch(`/api/share/memory/${memoryId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || "Failed to create share link");
      }

      const generatedToken = data?.data?.token ?? "";
      const relativeUrl = data?.data?.url ?? `/share/${generatedToken}`;
      const resolvedUrl = typeof window !== "undefined"
        ? `${window.location.origin}${relativeUrl}`
        : relativeUrl;

      setCreatedToken(generatedToken);
      setShareUrl(resolvedUrl);
    } catch (err) {
      console.error("Error generating memory share link:", err);
      setError(err instanceof Error ? err.message : "Unable to create share link");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopy = async () => {
    if (!shareUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch (error) {
      console.error("Failed to copy share link:", error);
    }
  };

  const handleRevoke = async () => {
    if (!createdToken) {
      return;
    }

    try {
      const response = await fetch(`/api/share/${createdToken}/revoke`, { method: "DELETE" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || "Failed to revoke share link");
      }

      setShareUrl("");
      setCreatedToken("");
      setCopied(false);
    } catch (err) {
      console.error("Error revoking share link:", err);
      setError(err instanceof Error ? err.message : "Unable to revoke share link");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">Share memory</p>
            <h3 className="mt-1 text-xl font-semibold text-gray-900">Create public link</h3>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5">
          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
              <TimerReset size={14} className="text-gray-500" />
              Expiration
            </span>
            <select
              value={expiresIn}
              onChange={(event) => setExpiresIn(event.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500"
            >
              {expiryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Shield size={14} className="text-gray-500" />
                Password protection
              </div>
              <button
                type="button"
                aria-pressed={passwordProtect}
                onClick={() => setPasswordProtect((current) => !current)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                  passwordProtect ? "bg-blue-600" : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 rounded-full bg-white transition ${
                    passwordProtect ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {passwordProtect && (
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter a password"
                className="mt-3 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500"
              />
            )}
          </div>

          {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          {!shareUrl ? (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => void handleGenerateLink()}
              className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
            >
              {isSubmitting ? "Creating link..." : "Generate share link"}
            </button>
          ) : (
            <div className="space-y-3 rounded-xl border border-blue-100 bg-blue-50 p-3">
              <div className="flex items-center gap-2 text-sm font-medium text-blue-700">
                <Link2 size={14} />
                Public link
              </div>
              <div className="overflow-hidden rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-gray-700 break-all">
                {shareUrl}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void handleCopy()}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  <Copy size={14} />
                  {copied ? "Copied" : "Copy link"}
                </button>
                <button
                  type="button"
                  onClick={() => void handleRevoke()}
                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-100"
                >
                  Revoke
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
