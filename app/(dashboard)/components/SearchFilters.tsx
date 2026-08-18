"use client";

import { useMemo } from "react";

const MEMORY_TYPES = [
  { value: "text", label: "Text" },
  { value: "photo", label: "Photo" },
  { value: "video", label: "Video" },
  { value: "audio", label: "Audio" },
];

interface SearchFiltersProps {
  selectedTypes: string[];
  selectedMood: string;
  selectedLocation: string;
  selectedTagIds: number[];
  moodOptions: string[];
  tagOptions: Array<{ id: number; name: string }>;
  onTypesChange: (nextTypes: string[]) => void;
  onMoodChange: (value: string) => void;
  onLocationChange: (value: string) => void;
  onTagIdsChange: (nextTagIds: number[]) => void;
  onClear: () => void;
}

export default function SearchFilters({
  selectedTypes,
  selectedMood,
  selectedLocation,
  selectedTagIds,
  moodOptions,
  tagOptions,
  onTypesChange,
  onMoodChange,
  onLocationChange,
  onTagIdsChange,
  onClear,
}: SearchFiltersProps) {
  const tagLookup = useMemo(
    () => new Map(tagOptions.map((tag) => [tag.id, tag.name])),
    [tagOptions]
  );

  const toggleType = (type: string) => {
    const next = selectedTypes.includes(type)
      ? selectedTypes.filter((item) => item !== type)
      : [...selectedTypes, type];

    onTypesChange(next);
  };

  const toggleTag = (tagId: number) => {
    const next = selectedTagIds.includes(tagId)
      ? selectedTagIds.filter((id) => id !== tagId)
      : [...selectedTagIds, tagId];

    onTagIdsChange(next);
  };

  return (
    <aside className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
        <button
          type="button"
          onClick={onClear}
          className="text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          Clear
        </button>
      </div>

      <div className="space-y-6">
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Memory type</label>
          <div className="space-y-2">
            {MEMORY_TYPES.map((type) => (
              <label key={type.value} className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={selectedTypes.includes(type.value)}
                  onChange={() => toggleType(type.value)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                {type.label}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Mood</label>
          <select
            value={selectedMood}
            onChange={(event) => onMoodChange(event.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Any mood</option>
            {moodOptions.map((mood) => (
              <option key={mood} value={mood}>
                {mood}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Location</label>
          <input
            type="text"
            value={selectedLocation}
            onChange={(event) => onLocationChange(event.target.value)}
            placeholder="Search by location"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Tags</label>
          <div className="max-h-56 space-y-2 overflow-y-auto rounded-lg border border-gray-200 p-2">
            {tagOptions.length === 0 ? (
              <p className="text-sm text-gray-500">No tags available</p>
            ) : (
              tagOptions.map((tag) => (
                <label key={tag.id} className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={selectedTagIds.includes(tag.id)}
                    onChange={() => toggleTag(tag.id)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>{tagLookup.get(tag.id) ?? tag.name}</span>
                </label>
              ))
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
