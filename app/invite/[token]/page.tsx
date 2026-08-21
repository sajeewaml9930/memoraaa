"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

interface InvitePayload {
  id: number;
  inviter: { id: number; fullName?: string | null; email: string };
  album: { id: number; name: string };
  permission: string;
  expiresAt?: string | null;
}

export default function InvitePage() {
  const router = useRouter();
  const params = useParams<{ token: string }>();
  const token = params?.token ?? "";
  const [invite, setInvite] = useState<InvitePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    async function loadInvite() {
      try {
        const response = await fetch(`/api/invite/${token}`);
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          setError(data?.error || "This invite is not available.");
          return;
        }

        setInvite(data?.data ?? null);
      } catch (err) {
        console.error("Error loading invite:", err);
        setError("Unable to load this invitation.");
      } finally {
        setLoading(false);
      }
    }

    void loadInvite();
  }, [token]);

  const handleAccept = async () => {
    if (!token) {
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      const response = await fetch(`/api/invite/${token}/accept`, { method: "POST" });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.error || "Unable to accept this invitation.");
      }

      setSuccess("Invitation accepted. You can now access the album.");
      setTimeout(() => router.push("/albums"), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to accept invitation.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!token) {
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      const response = await fetch(`/api/invite/${token}/reject`, { method: "POST" });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.error || "Unable to reject this invitation.");
      }

      setSuccess("Invitation rejected.");
      setTimeout(() => router.push("/albums"), 900);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to reject invitation.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 text-slate-700">
        <div className="rounded-2xl bg-white px-6 py-4 text-sm shadow-md">Loading invitation…</div>
      </main>
    );
  }

  if (error && !invite) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 text-slate-700">
        <div className="max-w-md rounded-2xl bg-white p-8 text-center shadow-lg">
          <p className="text-lg font-semibold text-slate-900">Album invite</p>
          <p className="mt-3 text-sm text-red-600">{error}</p>
        </div>
      </main>
    );
  }

  if (success) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 text-slate-700">
        <div className="max-w-md rounded-2xl bg-white p-8 text-center shadow-lg">
          <p className="text-lg font-semibold text-slate-900">Invitation update</p>
          <p className="mt-3 text-sm text-green-600">{success}</p>
        </div>
      </main>
    );
  }

  if (!invite) {
    return null;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 text-slate-700">
      <div className="w-full max-w-lg rounded-3xl bg-white p-8 shadow-lg">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">Album invitation</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">{invite.album.name}</h1>
        <p className="mt-3 text-sm text-slate-600">
          {invite.inviter.fullName || invite.inviter.email} invited you with <strong>{invite.permission}</strong> access.
        </p>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={() => void handleAccept()}
            disabled={submitting}
            className="flex-1 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            {submitting ? "Processing..." : "Accept"}
          </button>
          <button
            type="button"
            onClick={() => void handleReject()}
            disabled={submitting}
            className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Reject
          </button>
        </div>
      </div>
    </main>
  );
}
