"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Bell, Check, X } from "lucide-react";
import { useSocket } from "@/app/hooks/useSocket";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface NotificationItem {
  id: number;
  type: string;
  message: string;
  content?: string | null;
  link?: string | null;
  read: boolean;
  createdAt: string;
}

interface InviteDetails { albumName?: string; inviterName?: string }
interface Feedback { message: string; type: "success" | "error" }

function getInviteDetails(notification: NotificationItem): InviteDetails {
  try {
    return notification.content ? JSON.parse(notification.content) as InviteDetails : {};
  } catch { return {}; }
}

function getInviteToken(notification: NotificationItem) {
  if (!notification.link) return null;
  try {
    const url = new URL(notification.link, window.location.origin);
    if (!url.pathname.startsWith("/invite/")) return null;
    const token = url.pathname.slice("/invite/".length).split("/")[0];
    return token ? decodeURIComponent(token) : null;
  } catch { return null; }
}

export default function NotificationBell() {
  const { data: session } = useSession();
  const userId = session?.user?.id ? Number(session.user.id) : null;
  const socket = useSocket(null, userId);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const loadNotifications = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/notifications?unread=true&limit=50", { cache: "no-store" });
      if (response.ok) setNotifications((await response.json())?.data ?? []);
    } catch (error) { console.error("Error loading notifications:", error); }
    finally { setIsLoading(false); }
  };

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void loadNotifications(), 0);
    const onNotification = () => { void loadNotifications(); };
    socket?.on("notification", onNotification);
    return () => {
      window.clearTimeout(initialLoad);
      socket?.off("notification", onNotification);
    };
  }, [socket]);

  const markRead = async (notificationId: number) => {
    const response = await fetch(`/api/notifications/${notificationId}/read`, { method: "PATCH" });
    if (!response.ok) throw new Error("Unable to update notification");
  };

  const handleInvite = async (notification: NotificationItem, action: "accept" | "reject") => {
    const token = getInviteToken(notification);
    if (!token) { setFeedback({ message: "This invitation link is no longer available.", type: "error" }); return; }
    try {
      setProcessingId(notification.id);
      setFeedback(null);
      const response = await fetch(`/api/invite/${token}/${action}`, { method: "POST" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || `Unable to ${action} invitation`);
      setNotifications((current) => current.filter((item) => item.id !== notification.id));
      setFeedback({ message: action === "accept" ? "Invitation accepted." : "Invitation rejected.", type: "success" });
      if (action === "accept") window.dispatchEvent(new Event("memoraa:albums-changed"));
    } catch (error) {
      setFeedback({ message: error instanceof Error ? error.message : "Unable to update invitation", type: "error" });
    } finally { setProcessingId(null); }
  };

  const handleDismiss = async (notification: NotificationItem) => {
    try {
      await markRead(notification.id);
      setNotifications((current) => current.filter((item) => item.id !== notification.id));
    } catch (error) { console.error("Error marking notification as read:", error); }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<button type="button" className="relative flex h-10 w-10 items-center justify-center rounded-full transition-all text-gray-500 hover:bg-gray-100" aria-label={`Notifications${notifications.length ? `, ${notifications.length} unread` : ""}`} />}>
          <Bell className="h-5 w-5" />
          {notifications.length > 0 && <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">{notifications.length > 99 ? "99+" : notifications.length}</span>}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-2">
        <div className="flex items-center justify-between px-2 py-1"><h2 className="text-sm font-semibold">Notifications</h2><span className="text-xs text-muted-foreground">{notifications.length} unread</span></div>
        {feedback && <p role="status" className={`mx-2 my-2 rounded-md px-2 py-1.5 text-xs ${feedback.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>{feedback.message}</p>}
        <div className="max-h-80 space-y-2 overflow-y-auto p-1">
          {isLoading ? <p className="py-4 text-center text-sm text-muted-foreground">Loading...</p> : notifications.length === 0 ? <p className="py-4 text-center text-sm text-muted-foreground">You are all caught up.</p> : notifications.map((notification) => {
            const isInvite = notification.type === "invite";
            const details = getInviteDetails(notification);
            const isProcessing = processingId === notification.id;
            return <Card key={notification.id} size="sm" className="border-border/70 bg-muted/30"><CardContent className="p-3"><p className="text-sm leading-5">{isInvite && details.albumName ? `${details.inviterName || "Someone"} invited you to ${details.albumName}.` : notification.message}</p><div className="mt-2 flex items-center justify-between gap-2"><span className="text-xs text-muted-foreground">{new Date(notification.createdAt).toLocaleString()}</span>{isInvite ? <div className="flex gap-1"><Button size="sm" disabled={isProcessing} onClick={() => void handleInvite(notification, "accept")} className="h-7 px-2 text-xs"><Check className="mr-1 h-3 w-3" />Accept</Button><Button size="sm" variant="outline" disabled={isProcessing} onClick={() => void handleInvite(notification, "reject")} className="h-7 px-2 text-xs"><X className="mr-1 h-3 w-3" />Reject</Button></div> : <Button variant="ghost" size="sm" onClick={() => void handleDismiss(notification)} className="h-7 px-2 text-xs">Mark read</Button>}</div></CardContent></Card>;
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
