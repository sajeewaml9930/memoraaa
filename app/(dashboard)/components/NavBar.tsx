"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  MessageCircle,
  Layers,
  Clock,
  Archive,
  Settings,
  LogOut,
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";

export default function NavBar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [unreadStories, setUnreadStories] = useState(false);

  useEffect(() => {
    let isMounted = true;

    fetch("/api/stories")
      .then((response) => response.json())
      .then((data) => {
        if (isMounted && data?.data?.unreadCount > 0) {
          setUnreadStories(true);
        }
      })
      .catch(() => undefined);

    return () => {
      isMounted = false;
    };
  }, [pathname]);

  const isActive = (path: string) => {
    if (path === "/chats" && pathname === "/chats") return true;
    return pathname.startsWith(path) && path !== "/chats";
  };

  const navItems = [
    { href: "/chats", icon: MessageCircle, label: "Chats", title: "Messages" },
    { href: "/albums", icon: Layers, label: "Albums", title: "All Albums" },
    { href: "/status", icon: Clock, label: "Status", title: "Stories" },
    { href: "/archived", icon: Archive, label: "Archive", title: "Archived" },
    { href: "/settings", icon: Settings, label: "Settings", title: "Settings" },
  ];

  const profileName = session?.user?.name || "You";
  const profileImage = session?.user?.image || null;

  return (
    <nav className="flex w-16 flex-col items-center border-r border-gray-200 bg-white py-4">
      <Link
        href="/settings"
        title={profileName}
        className="mb-8 flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-gray-100 text-xs font-semibold text-gray-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
      >
        {profileImage ? (
          <img src={profileImage} alt={profileName} className="h-full w-full object-cover" />
        ) : (
          profileName.slice(0, 1).toUpperCase()
        )}
      </Link>

      <div className="space-y-4">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            title={item.title}
            className={`relative flex h-10 w-10 items-center justify-center rounded-full transition-all ${
              isActive(item.href)
                ? "bg-blue-100 text-blue-600"
                : "text-gray-500 hover:bg-gray-100"
            }`}
          >
            <item.icon size={20} />
            {isActive(item.href) && (
              <span className="absolute -left-1 h-2 w-2 rounded-full bg-blue-600"></span>
            )}
            {item.href === "/status" && unreadStories && (
              <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-red-500" />
            )}
          </Link>
        ))}
      </div>

      <div className="mt-auto">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          title="Sign out"
          className="flex h-10 w-10 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"
        >
          <LogOut size={20} />
        </button>
      </div>
    </nav>
  );
}
