"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, SlidersHorizontal, X } from "lucide-react";

export type AlbumSortValue = "date-desc" | "date-asc" | "name-asc" | "name-desc";
export type AlbumOwnerFilter = "all" | "owned" | "shared";
export type AlbumPrivacyFilter = "all" | "private" | "shared";
export type AlbumContentType = "all" | "text" | "photo" | "video" | "audio";

interface AlbumListControlsProps {
  sortValue: AlbumSortValue;
  ownerFilter: AlbumOwnerFilter;
  privacyFilter: AlbumPrivacyFilter;
  contentType: AlbumContentType;
  onSortChange: (value: AlbumSortValue) => void;
  onOwnerFilterChange: (value: AlbumOwnerFilter) => void;
  onPrivacyFilterChange: (value: AlbumPrivacyFilter) => void;
  onContentTypeChange: (value: AlbumContentType) => void;
}

const typeOptions: Array<{ value: AlbumContentType; label: string }> = [
  { value: "all", label: "All" },
  { value: "text", label: "Text" },
  { value: "photo", label: "Photos" },
  { value: "video", label: "Videos" },
  { value: "audio", label: "Audio" },
];

const sortLabels: Record<AlbumSortValue, string> = {
  "date-desc": "Most recent",
  "date-asc": "Oldest",
  "name-asc": "Name A-Z",
  "name-desc": "Name Z-A",
};

export default function AlbumListControls({
  sortValue,
  ownerFilter,
  privacyFilter,
  contentType,
  onSortChange,
  onOwnerFilterChange,
  onPrivacyFilterChange,
  onContentTypeChange,
}: AlbumListControlsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const controlsRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const firstFilterRef = useRef<HTMLSelectElement | null>(null);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (controlsRef.current && !controlsRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      firstFilterRef.current?.focus();
    }
  }, [isOpen]);

  const activeFilters = [
    sortValue !== "date-desc" ? sortLabels[sortValue] : null,
    ownerFilter !== "all" ? (ownerFilter === "owned" ? "My albums" : "Shared with me") : null,
    privacyFilter !== "all" ? (privacyFilter === "private" ? "Private" : "Shared") : null,
    contentType !== "all"
      ? typeOptions.find((option) => option.value === contentType)?.label ?? null
      : null,
  ].filter((value): value is string => Boolean(value));

  const resetFilters = () => {
    onSortChange("date-desc");
    onOwnerFilterChange("all");
    onPrivacyFilterChange("all");
    onContentTypeChange("all");
  };

  return (
    <div ref={controlsRef} className="relative z-20 border-b border-gray-200 bg-white p-3">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        aria-expanded={isOpen}
        aria-controls="album-list-filters"
        className={`flex w-full items-center gap-2 rounded-full px-3 py-2 text-left text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-blue-200 ${
          activeFilters.length > 0
            ? "bg-blue-50 text-blue-700 hover:bg-blue-100"
            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
        }`}
      >
        <SlidersHorizontal size={16} className={activeFilters.length > 0 ? "text-blue-600" : "text-gray-500"} />
        <span className="min-w-0 flex-1">
          <span className="block">Sort & filter</span>
          {activeFilters.length > 0 && (
            <span className="block truncate text-xs font-normal text-blue-600">
              {activeFilters.join(" · ")}
            </span>
          )}
        </span>
        {activeFilters.length > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1.5 text-[11px] font-semibold text-white">
            {activeFilters.length}
          </span>
        )}
        <ChevronDown size={16} className={`shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      <div
        id="album-list-filters"
        aria-hidden={!isOpen}
        className={`absolute left-3 right-3 top-full mt-2 space-y-3 rounded-xl border border-gray-200 bg-white p-3 shadow-lg transition-all duration-200 ease-out ${
          isOpen
            ? "translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-2 opacity-0"
        }`}
      >
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-800">Filter albums</p>
          {activeFilters.length > 0 && (
            <button
              type="button"
              onClick={resetFilters}
              className="flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            >
              <X size={13} />
              Clear
            </button>
          )}
        </div>

          <div className="grid grid-cols-2 gap-2">
        <label className="block text-xs font-medium uppercase tracking-wide text-gray-500">
          Sort
          <select
            ref={firstFilterRef}
            value={sortValue}
            onChange={(event) => onSortChange(event.target.value as AlbumSortValue)}
            className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-2 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="date-desc">Most recent</option>
            <option value="date-asc">Oldest</option>
            <option value="name-asc">Name A–Z</option>
            <option value="name-desc">Name Z–A</option>
          </select>
        </label>

        <label className="block text-xs font-medium uppercase tracking-wide text-gray-500">
          Privacy
          <select
            value={privacyFilter}
            onChange={(event) => onPrivacyFilterChange(event.target.value as AlbumPrivacyFilter)}
            className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-2 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All</option>
            <option value="private">Private</option>
            <option value="shared">Shared/public</option>
          </select>
        </label>
          </div>

          <div>
        <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-gray-500">
          Album ownership
        </div>
        <div className="flex gap-2">
          {(["all", "owned", "shared"] as const).map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => onOwnerFilterChange(filter)}
              className={`flex-1 rounded-full px-2.5 py-1.5 text-xs font-medium transition ${
                ownerFilter === filter
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {filter === "all" ? "All" : filter === "owned" ? "My albums" : "Shared with me"}
            </button>
          ))}
        </div>
          </div>

          <div>
        <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-gray-500">
          Content type
        </div>
        <div className="flex flex-wrap gap-2">
          {typeOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onContentTypeChange(option.value)}
              className={`rounded-full px-2.5 py-1.5 text-xs font-medium transition ${
                contentType === option.value
                  ? "bg-gray-800 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
          </div>
        </div>
    </div>
  );
}
