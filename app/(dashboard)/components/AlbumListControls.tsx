"use client";

import { SlidersHorizontal } from "lucide-react";

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
  return (
    <div className="border-b border-gray-200 bg-white p-3 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
        <SlidersHorizontal size={16} className="text-gray-500" />
        <span>Sort & filter</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="block text-xs font-medium uppercase tracking-wide text-gray-500">
          Sort
          <select
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
  );
}
