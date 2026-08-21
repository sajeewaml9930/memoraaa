"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Layers, Archive, Settings, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import NotificationBell from "./NotificationBell";

export default function NavBar() {
  const pathname = usePathname();
  const isActive = (path: string) => pathname.startsWith(path);

  const navItems = [
    { href: "/albums", icon: Layers, label: "Albums", title: "All Albums" },
    { href: "/archived", icon: Archive, label: "Archive", title: "Archived" },
    { href: "/settings", icon: Settings, label: "Settings", title: "Settings" },
  ];

  return (
    <nav
      className={`shrink-0 bg-background/90 p-2 backdrop-blur md:p-3 ${
        pathname.startsWith("/album/") ? "max-md:hidden" : ""
      }`}
    >
      <div className="mx-auto flex max-w-md items-center justify-around rounded-xl border border-border bg-background/90 px-1 py-2 shadow-lg md:px-2">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            title={item.title}
            aria-label={item.title}
            className={`relative flex h-10 w-10 items-center justify-center rounded-full transition-all ${
              isActive(item.href)
                ? "bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-300"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <item.icon size={20} />
            {isActive(item.href) && (
              <span className="absolute -top-1 h-2 w-2 rounded-full bg-blue-600"></span>
            )}
          </Link>
        ))}
        <NotificationBell />
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          title="Sign out"
          aria-label="Sign out"
          className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
        >
          <LogOut size={20} />
        </button>
      </div>
    </nav>
  );
}
