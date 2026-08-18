"use client";

import { useEffect, useMemo, useState } from "react";
import { Camera, Plus, Sparkles, User } from "lucide-react";
import StoryViewer from "@/app/(dashboard)/components/StoryViewer";
import type { StoryItem } from "@/app/types";

interface StoryGroup {
  userId: number;
  author: { id: number; username: string; fullName?: string | null; avatar?: string | null } | null;
  stories: StoryItem[];
  hasUnread: boolean;
}

export default function StatusPage() {
  const [groups, setGroups] = useState<StoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStoryId, setSelectedStoryId] = useState<number | null>(null);
  const [isCreatingStory, setIsCreatingStory] = useState(false);
  const [storyText, setStoryText] = useState("");

  useEffect(() => {
    fetchStories();
  }, []);

  const fetchStories = async () => {
    try {
      const response = await fetch("/api/stories");
      const data = await response.json();
      setGroups(data?.data?.groups ?? []);
    } catch (error) {
      console.error("Error fetching stories:", error);
    } finally {
      setLoading(false);
    }
  };

  const visibleStories = useMemo(
    () => groups.flatMap((group) => group.stories),
    [groups]
  );

  const selectedStories = useMemo(() => {
    if (selectedStoryId == null) {
      return [];
    }

    const selectedGroup = groups.find((group) => group.stories.some((story) => story.id === selectedStoryId));
    return selectedGroup?.stories ?? [];
  }, [groups, selectedStoryId]);

  const createStory = async () => {
    if (!storyText.trim()) {
      return;
    }

    setIsCreatingStory(true);

    try {
      const response = await fetch("/api/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memoryType: "text",
          content: storyText,
          isStory: true,
          memoryDate: new Date().toISOString(),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Unable to create story");
      }

      setStoryText("");
      await fetchStories();
    } catch (error) {
      console.error("Error creating story:", error);
      window.alert(error instanceof Error ? error.message : "Unable to create story");
    } finally {
      setIsCreatingStory(false);
    }
  };

  if (loading) {
    return <div className="flex flex-1 items-center justify-center text-gray-500">Loading stories...</div>;
  }

  return (
    <div className="flex flex-1 flex-col bg-gray-50">
      <div className="border-b border-gray-200 bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Status</h1>
            <p className="text-sm text-gray-500">Your story feed</p>
          </div>
          <button type="button" className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700">
            <Plus size={16} />
            New story
          </button>
        </div>

        <div className="mt-4 rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600">
              <Camera size={18} />
            </div>
            <div className="flex-1">
              <textarea
                value={storyText}
                onChange={(event) => setStoryText(event.target.value)}
                placeholder="Share a quick update..."
                className="w-full resize-none border-none bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
                rows={2}
              />
            </div>
            <button
              type="button"
              onClick={createStory}
              disabled={isCreatingStory || !storyText.trim()}
              className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {isCreatingStory ? "Posting..." : "Post"}
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {groups.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white text-center text-gray-500">
            <Sparkles className="mb-2 text-indigo-500" size={28} />
            <p className="text-lg font-medium text-gray-700">No stories yet</p>
            <p className="mt-1 max-w-sm text-sm">Create the first story to share a moment with your album circles.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {groups.map((group) => {
              const newestStory = group.stories[0];
              return (
                <button
                  key={group.userId}
                  type="button"
                  className="flex w-full items-center gap-4 rounded-2xl border border-gray-200 bg-white p-3 text-left shadow-sm"
                  onClick={() => setSelectedStoryId(newestStory?.id ?? null)}
                >
                  <div className={`flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 ${group.hasUnread ? "border-orange-400" : "border-gray-200"}`}>
                    {group.author?.avatar ? (
                      <img src={group.author.avatar} alt={group.author.username} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gray-100 text-lg font-semibold text-gray-600">
                        {group.author?.username?.slice(0, 1).toUpperCase() ?? "U"}
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-base font-semibold text-gray-900">{group.author?.fullName ?? group.author?.username ?? "Unknown user"}</p>
                      <span className="text-xs text-gray-400">{group.stories.length} story{group.stories.length === 1 ? "" : "ies"}</span>
                    </div>
                    <p className="mt-1 truncate text-sm text-gray-500">{newestStory?.description || newestStory?.storyContent || "Tap to view"}</p>
                    <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
                      <User size={12} />
                      <span>{newestStory?.viewCount ?? 0} views</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selectedStoryId != null && selectedStories.length > 0 && (
        <StoryViewer
          stories={selectedStories}
          initialIndex={selectedStories.findIndex((story) => story.id === selectedStoryId)}
          onClose={() => setSelectedStoryId(null)}
        />
      )}
    </div>
  );
}
