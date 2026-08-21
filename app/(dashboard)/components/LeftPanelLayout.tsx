import type { ReactNode } from "react";

export default function LeftPanelLayout({ children }: { children: ReactNode }) {
  return (
    <aside className="flex min-h-0 w-full shrink-0 flex-col border-r border-gray-200 bg-white md:w-80">
      <div className="min-h-0 flex-1 overflow-y-auto pb-24">{children}</div>
    </aside>
  );
}
