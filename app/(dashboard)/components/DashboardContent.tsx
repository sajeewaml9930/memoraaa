"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export default function DashboardContent({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAlbumDetail = pathname.startsWith("/album/");

  return (
    <div className={`flex flex-1 overflow-hidden ${isAlbumDetail ? "pb-0" : "pb-16 md:pb-0"}`}>
      {children}
    </div>
  );
}
