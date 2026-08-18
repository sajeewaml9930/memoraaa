"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface ShareMemoryData {
  id: number;
  token: string;
  memoryType: string;
  title?: string | null;
  description?: string | null;
  content?: string;
  mediaUrl?: string | null;
  thumbnailUrl?: string | null;
  memoryDate?: string | Date | null;
  createdAt?: string | Date | null;
  passwordProtected?: boolean;
}

export default function SharedMemoryPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token ?? "";
  const [memory, setMemory] = useState<ShareMemoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    let active = true;

    async function loadMemory() {
      try {
        setLoading(true);
        setPasswordError("");
        const response = await fetch(`/api/share/${token}`);
        const data = await response.json().catch(() => ({}));

        if (!active) {
          return;
        }

        if (!response.ok) {
          if (data?.expired) {
            setStatusMessage("This link has expired.");
          } else if (data?.requiresPassword) {
            setRequiresPassword(true);
          } else {
            setStatusMessage(data?.error || "This link is not available.");
          }
          return;
        }

        if (data?.requiresPassword) {
          setRequiresPassword(true);
          return;
        }

        setMemory(data?.data ?? null);
        setRequiresPassword(false);
      } catch (error) {
        console.error("Failed to load share page:", error);
        if (active) {
          setStatusMessage("Unable to load this memory right now.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadMemory();

    return () => {
      active = false;
    };
  }, [token]);

  const handlePasswordSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!token || !password.trim()) {
      return;
    }

    try {
      setIsVerifying(true);
      setPasswordError("");

      const response = await fetch(`/api/share/${token}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.error || "Incorrect password");
      }

      setRequiresPassword(false);
      const memoryResponse = await fetch(`/api/share/${token}`);
      const memoryData = await memoryResponse.json().catch(() => ({}));

      if (!memoryResponse.ok) {
        setStatusMessage(memoryData?.error || "This link is not available.");
        return;
      }

      setMemory(memoryData?.data ?? null);
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : "Incorrect password");
    } finally {
      setIsVerifying(false);
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 text-slate-700">
        <div className="rounded-2xl bg-white px-6 py-4 text-sm shadow-md">Loading shared memory…</div>
      </main>
    );
  }

  if (statusMessage) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 text-slate-700">
        <div className="max-w-md rounded-2xl bg-white p-8 text-center shadow-lg">
          <p className="text-lg font-semibold text-slate-900">Shared memory</p>
          <p className="mt-3 text-sm text-slate-600">{statusMessage}</p>
        </div>
      </main>
    );
  }

  if (requiresPassword) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 text-slate-700">
        <form onSubmit={handlePasswordSubmit} className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">Protected memory</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">Enter password</h1>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            className="mt-5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500"
          />
          {passwordError && <p className="mt-3 text-sm text-red-600">{passwordError}</p>}
          <button
            type="submit"
            disabled={isVerifying || !password.trim()}
            className="mt-5 w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            {isVerifying ? "Checking..." : "Unlock memory"}
          </button>
        </form>
      </main>
    );
  }

  if (!memory) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 text-slate-700">
        <div className="rounded-2xl bg-white px-6 py-4 text-sm shadow-md">No shared memory found.</div>
      </main>
    );
  }

  const dateLabel = memory.memoryDate ? new Date(memory.memoryDate).toLocaleDateString() : new Date(memory.createdAt ?? Date.now()).toLocaleDateString();

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-800">
      <div className="mx-auto max-w-3xl rounded-3xl bg-white p-6 shadow-lg">
        <div className="mb-5 border-b border-slate-200 pb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">Shared memory</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">{memory.title || "Memory"}</h1>
          <p className="mt-2 text-sm text-slate-500">{dateLabel}</p>
        </div>

        {memory.memoryType === "text" && memory.content && (
          <div className="whitespace-pre-wrap break-words text-base leading-7 text-slate-700">{memory.content}</div>
        )}

        {(memory.memoryType === "photo" || memory.memoryType === "image") && memory.mediaUrl && (
          <img src={memory.mediaUrl} alt="Shared memory" className="w-full rounded-2xl object-cover" />
        )}

        {memory.memoryType === "video" && memory.mediaUrl && (
          <video controls className="w-full rounded-2xl bg-slate-950" src={memory.mediaUrl} />
        )}

        {(memory.memoryType === "audio" || memory.memoryType === "voice") && memory.mediaUrl && (
          <audio controls className="w-full" src={memory.mediaUrl} />
        )}

        {memory.description && (
          <p className="mt-5 text-sm text-slate-600 wrap-break-word">{memory.description}</p>
        )}
      </div>
    </main>
  );
}
