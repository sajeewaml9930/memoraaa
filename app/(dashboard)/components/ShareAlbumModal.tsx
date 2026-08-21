"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { Album } from "@/app/types";

interface CollaboratorEntry {
  id: number;
  email: string;
  fullName?: string | null;
  permission: "view" | "add" | "edit" | "admin";
}

interface PendingInvite {
  id: number;
  permission: string;
  token?: string | null;
  user?: { email?: string | null; fullName?: string | null };
}

interface ShareAlbumModalProps {
  isOpen: boolean;
  album: Album | null;
  onClose: () => void;
  onSuccess?: (album: Album) => void;
}

const permissionOptions = [
  { value: "view", label: "View" },
  { value: "add", label: "Add" },
  { value: "edit", label: "Edit" },
  { value: "admin", label: "Admin" },
] as const;

export default function ShareAlbumModal({ isOpen, album, onClose }: ShareAlbumModalProps) {
  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState<(typeof permissionOptions)[number]["value"]>("view");
  const [collaborators, setCollaborators] = useState<CollaboratorEntry[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCopying, setIsCopying] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen || !album) {
      return;
    }

    const loadShareData = async () => {
      try {
        setIsLoading(true);
        const [albumResponse, invitesResponse] = await Promise.all([
          fetch(`/api/albums/${album.id}`),
          fetch(`/api/share/album/${album.id}/invites`),
        ]);

        const albumData = await albumResponse.json().catch(() => ({}));
        const invitesData = await invitesResponse.json().catch(() => ({}));

        setCollaborators(albumData?.data?.collaborators ?? []);
        setPendingInvites(invitesData?.data ?? []);
      } catch (error) {
        console.error("Error fetching share data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadShareData();
  }, [isOpen, album]);

  if (!isOpen || !album) {
    return null;
  }

  const handleInvite = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim()) {
      window.alert("Please enter an email address.");
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch(`/api/share/album/${album.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, permission }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.error || "Failed to invite user");
      }

      setEmail("");
      const inviteResponse = await fetch(`/api/share/album/${album.id}/invites`);
      const inviteData = await inviteResponse.json().catch(() => ({}));
      setPendingInvites(inviteData?.data ?? []);
      if (data?.data?.inviteUrl) {
        const emailMessage = data?.data?.email?.sent
          ? "The invitation email was sent."
          : "The invitation was saved, but the email was not sent. Use this link instead.";
        window.alert(`${emailMessage} Share this link: ${data.data.inviteUrl}`);
      }
    } catch (error) {
      console.error("Error inviting collaborator:", error);
      window.alert(error instanceof Error ? error.message : "Unable to invite user");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePermissionUpdate = async (userId: number, nextPermission: string) => {
    try {
      const response = await fetch(`/api/share/album/${album.id}/permission`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, permission: nextPermission }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to update permission");
      }

      setCollaborators((current) =>
        current.map((entry) =>
          entry.id === userId ? { ...entry, permission: nextPermission as CollaboratorEntry["permission"] } : entry
        )
      );
    } catch (error) {
      console.error("Error updating collaborator permission:", error);
      window.alert(error instanceof Error ? error.message : "Unable to update permission");
    }
  };

  const handleRemoveCollaborator = async (userId: number) => {
    try {
      const response = await fetch(`/api/share/album/${album.id}/user/${userId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to remove collaborator");
      }

      setCollaborators((current) => current.filter((entry) => entry.id !== userId));
    } catch (error) {
      console.error("Error removing collaborator:", error);
      window.alert(error instanceof Error ? error.message : "Unable to remove collaborator");
    }
  };

  const handleRejectInvite = async (inviteId: number) => {
    try {
      const response = await fetch(`/api/share/invite/${inviteId}/reject`, { method: "POST" });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to reject invite");
      }

      setPendingInvites((current) => current.filter((invite) => invite.id !== inviteId));
    } catch (error) {
      console.error("Error rejecting invite:", error);
      window.alert(error instanceof Error ? error.message : "Unable to reject invite");
    }
  };

  const handleCopyInviteLink = async (invite: { token?: string | null; id: number; user?: { email?: string | null } }) => {
    const token = invite.token;
    if (!token) {
      window.alert("This invite has no link token available.");
      return;
    }

    const url = `${window.location.origin}/invite/${token}`;
    try {
      setIsCopying(invite.id);
      await navigator.clipboard.writeText(url);
      window.alert("Invite link copied to clipboard.");
    } catch (error) {
      console.error("Error copying invite link:", error);
      window.prompt("Copy this invite link manually:", url);
    } finally {
      setIsCopying(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Share {album.name}</h2>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleInvite} className="mb-6 space-y-3">
          <label className="block text-sm font-medium text-gray-700">Invite collaborator</label>
          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-blue-500"
              placeholder="user@example.com"
            />
            <select
              value={permission}
              onChange={(event) => setPermission(event.target.value as (typeof permissionOptions)[number]["value"])}
              className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-blue-500"
            >
              {permissionOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? "Sending..." : "Invite"}
            </button>
          </div>
        </form>

        <div className="space-y-6">
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Collaborators</h3>
            {isLoading ? (
              <p className="text-sm text-gray-500">Loading collaborators...</p>
            ) : collaborators.length === 0 ? (
              <p className="text-sm text-gray-500">No collaborators yet.</p>
            ) : (
              <div className="space-y-2">
                {collaborators.map((collaborator) => (
                  <div key={collaborator.id} className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 p-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{collaborator.fullName || collaborator.email}</p>
                      <p className="text-xs text-gray-500">{collaborator.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={collaborator.permission}
                        onChange={(event) => handlePermissionUpdate(collaborator.id, event.target.value)}
                        className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs outline-none focus:border-blue-500"
                      >
                        {permissionOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => handleRemoveCollaborator(collaborator.id)}
                        className="rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-100"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Pending invitations</h3>
            {pendingInvites.length === 0 ? (
              <p className="text-sm text-gray-500">No pending invites.</p>
            ) : (
              <div className="space-y-2">
                {pendingInvites.map((invite) => (
                  <div key={invite.id} className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 p-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{invite.user?.fullName || invite.user?.email}</p>
                      <p className="text-xs text-gray-500">{invite.permission}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {invite.token && (
                        <button
                          type="button"
                          disabled={isCopying === invite.id}
                          onClick={() => void handleCopyInviteLink(invite)}
                          className="rounded-lg border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-60"
                        >
                          {isCopying === invite.id ? "Copying..." : "Copy link"}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => void handleRejectInvite(invite.id)}
                        className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
