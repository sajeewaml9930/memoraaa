"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Search, CalendarRange, FolderOpen, ArrowLeft } from "lucide-react";
import SearchFilters from "@/app/(dashboard)/components/SearchFilters";
import LeftPanelLayout from "../components/LeftPanelLayout";

interface SearchResult {
  id: number;
  memoryType: string;
  title?: string | null;
  description?: string | null;
  mood?: string | null;
  content: string;
  snippet: string;
  memoryDate: string;
  createdAt: string;
  albumId: number | null;
  albumName: string;
  status: string;
  isFavorite: boolean;
  isPinned: boolean;
}

interface RecentSearch {
  id: number;
  query: string;
  filters?: Record<string, unknown>;
  createdAt: string;
}

const parseCsv = (value: string | null) =>
  (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const parseNumericCsv = (value: string | null) =>
  parseCsv(value)
    .map((item) => Number.parseInt(item, 10))
    .filter((item) => Number.isFinite(item));

export default function SearchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [albums, setAlbums] = useState<Array<{ id: number; name: string }>>([]);
  const [tagOptions, setTagOptions] = useState<Array<{ id: number; name: string }>>([]);
  const [moodOptions, setMoodOptions] = useState<string[]>([]);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [isSuggestionsLoading, setIsSuggestionsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit] = useState(25);

  const query = (searchParams.get("q") ?? "").trim();
  const mode = (searchParams.get("mode") ?? "simple").trim().toLowerCase();
  const albumIdParam = searchParams.get("albumId") ?? "";
  const fromParam = searchParams.get("from") ?? "";
  const toParam = searchParams.get("to") ?? "";
  const typesParam = searchParams.get("types") ?? "";
  const moodParam = searchParams.get("mood") ?? "";
  const tagIdsParam = searchParams.get("tagIds") ?? "";

  const currentAlbumId = albumIdParam ? Number(albumIdParam) : "";
  const isAdvancedMode = mode === "advanced";
  const selectedTypes = parseCsv(typesParam);
  const selectedTagIds = parseNumericCsv(tagIdsParam);

  useEffect(() => {
    fetch("/api/albums")
      .then((res) => res.json())
      .then((data) => {
        setAlbums(data?.data ?? []);
      })
      .catch(() => setAlbums([]));

    fetch("/api/tags")
      .then((res) => res.json())
      .then((data) => {
        setTagOptions(data?.data ?? []);
      })
      .catch(() => setTagOptions([]));

    fetch("/api/moods")
      .then((res) => res.json())
      .then((data) => {
        setMoodOptions(data?.data ?? []);
      })
      .catch(() => setMoodOptions([]));
  }, []);

  useEffect(() => {
    const fetchHistory = async () => {
      setIsHistoryLoading(true);

      try {
        const response = await fetch("/api/search/history");
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error || "Failed to fetch recent searches");
        }

        setRecentSearches(data?.data ?? []);
      } catch (error) {
        console.error("Error fetching recent searches:", error);
        setRecentSearches([]);
      } finally {
        setIsHistoryLoading(false);
      }
    };

    fetchHistory();
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const fetchResults = async () => {
      setIsLoading(true);

      try {
        const params = new URLSearchParams({
          q: query,
          page: String(page),
          limit: String(limit),
        });

        if (mode === "advanced") {
          params.set("mode", "advanced");
        }

        if (albumIdParam) {
          params.set("albumId", albumIdParam);
        }

        if (fromParam) {
          params.set("from", fromParam);
        }

        if (toParam) {
          params.set("to", toParam);
        }

        if (typesParam) {
          params.set("types", typesParam);
        }

        if (moodParam) {
          params.set("mood", moodParam);
        }

        if (tagIdsParam) {
          params.set("tagIds", tagIdsParam);
        }

        const response = await fetch(`/api/search?${params.toString()}`, {
          signal: controller.signal,
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error || "Failed to load search results");
        }

        setResults(data?.data?.results ?? []);
        setTotal(data?.data?.total ?? 0);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.error("Error fetching search results:", error);
          setResults([]);
          setTotal(0);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    fetchResults();

    return () => controller.abort();
  }, [albumIdParam, fromParam, page, limit, mode, moodParam, query, tagIdsParam, toParam, typesParam]);

  const pageCount = useMemo(() => Math.max(1, Math.ceil(total / limit)), [limit, total]);

  const buildFilterPayload = () => ({
    q: query,
    mode,
    albumId: albumIdParam,
    from: fromParam,
    to: toParam,
    types: typesParam,
    mood: moodParam,
    tagIds: tagIdsParam,
  });

  const saveRecentSearch = async (
    nextQuery = query,
    nextFilters: Record<string, string | undefined> = buildFilterPayload()
  ) => {
    const trimmedQuery = (nextQuery ?? "").trim();
    if (!trimmedQuery) {
      return;
    }

    try {
      const response = await fetch("/api/search/history", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: trimmedQuery,
          filters: nextFilters,
        }),
      });

      if (!response.ok) {
        return;
      }

      const data = await response.json();
      const savedSearch = data?.data;

      if (!savedSearch) {
        return;
      }

      setRecentSearches((current) => [
        { id: savedSearch.id, query: savedSearch.query, filters: savedSearch.filters, createdAt: savedSearch.createdAt },
        ...current.filter((item) => item.id !== savedSearch.id),
      ].slice(0, 10));
    } catch (error) {
      console.error("Error saving recent search:", error);
    }
  };

  const handleSubmitSearch = async (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();

    const trimmedQuery = query.trim();
    const params = new URLSearchParams(searchParams.toString());
    const nextParams = new URLSearchParams();

    if (trimmedQuery) {
      params.set("q", trimmedQuery);
      nextParams.set("q", trimmedQuery);
    } else {
      params.delete("q");
      nextParams.delete("q");
    }

    if (isAdvancedMode) {
      params.set("mode", "advanced");
      nextParams.set("mode", "advanced");
    } else {
      params.delete("mode");
      nextParams.delete("mode");
    }

    if (albumIdParam) {
      params.set("albumId", albumIdParam);
      nextParams.set("albumId", albumIdParam);
    }

    if (fromParam) {
      params.set("from", fromParam);
      nextParams.set("from", fromParam);
    }

    if (toParam) {
      params.set("to", toParam);
      nextParams.set("to", toParam);
    }

    if (typesParam) {
      params.set("types", typesParam);
      nextParams.set("types", typesParam);
    }

    if (moodParam) {
      params.set("mood", moodParam);
      nextParams.set("mood", moodParam);
    }

    if (tagIdsParam) {
      params.set("tagIds", tagIdsParam);
      nextParams.set("tagIds", tagIdsParam);
    }

    params.delete("page");
    setPage(1);
    router.push(`/search?${params.toString()}`);

    if (trimmedQuery) {
      await saveRecentSearch(trimmedQuery, {
        q: trimmedQuery,
        mode: isAdvancedMode ? "advanced" : "simple",
        albumId: albumIdParam || undefined,
        from: fromParam || undefined,
        to: toParam || undefined,
        types: typesParam || undefined,
        mood: moodParam || undefined,
        tagIds: tagIdsParam || undefined,
      });
      const historyResponse = await fetch("/api/search/history");
      const historyData = await historyResponse.json();

      if (historyResponse.ok) {
        setRecentSearches(historyData?.data ?? []);
      }
    }
  };

  const handleFilterChange = (
    next: Partial<{ q: string; albumId: string; from: string; to: string; types: string; mood: string; tagIds: string }>
  ) => {
    const params = new URLSearchParams(searchParams.toString());

    const merged = {
      q: query,
      albumId: albumIdParam,
      from: fromParam,
      to: toParam,
      types: typesParam,
      mood: moodParam,
      tagIds: tagIdsParam,
      ...next,
    };

    if (merged.q) {
      params.set("q", merged.q);
    } else {
      params.delete("q");
    }

    if (isAdvancedMode) {
      params.set("mode", "advanced");
    } else {
      params.delete("mode");
    }

    if (merged.albumId) {
      params.set("albumId", merged.albumId);
    } else {
      params.delete("albumId");
    }

    if (merged.from) {
      params.set("from", merged.from);
    } else {
      params.delete("from");
    }

    if (merged.to) {
      params.set("to", merged.to);
    } else {
      params.delete("to");
    }

    if (merged.types) {
      params.set("types", merged.types);
    } else {
      params.delete("types");
    }

    if (merged.mood) {
      params.set("mood", merged.mood);
    } else {
      params.delete("mood");
    }

    if (merged.tagIds) {
      params.set("tagIds", merged.tagIds);
    } else {
      params.delete("tagIds");
    }

    params.delete("page");
    setPage(1);
    router.push(`/search?${params.toString()}`);
  };

  const handleClearFilters = () => {
    handleFilterChange({
      albumId: "",
      from: "",
      to: "",
      types: "",
      mood: "",
      tagIds: "",
    });
  };

  const handleRecentSearchClick = (item: RecentSearch) => {
    const filters = (item.filters ?? {}) as Record<string, unknown>;
    const nextParams = new URLSearchParams();
    const nextQ = typeof filters.q === "string" ? filters.q : item.query;
    const nextMode = typeof filters.mode === "string" ? filters.mode : "simple";

    if (nextQ) {
      nextParams.set("q", nextQ);
    }

    if (nextMode === "advanced") {
      nextParams.set("mode", "advanced");
    }

    const albumId = filters.albumId ?? albumIdParam;
    const from = filters.from ?? fromParam;
    const to = filters.to ?? toParam;
    const types = filters.types ?? typesParam;
    const mood = filters.mood ?? moodParam;
    const tagIds = filters.tagIds ?? tagIdsParam;

    if (albumId) {
      nextParams.set("albumId", String(albumId));
    }

    if (from) {
      nextParams.set("from", String(from));
    }

    if (to) {
      nextParams.set("to", String(to));
    }

    if (types) {
      nextParams.set("types", String(types));
    }

    if (mood) {
      nextParams.set("mood", String(mood));
    }

    if (tagIds) {
      nextParams.set("tagIds", String(tagIds));
    }

    router.push(`/search?${nextParams.toString()}`);
    setPage(1);
  };

  const handleDeleteRecentSearch = async (id: number) => {
    try {
      const response = await fetch(`/api/search/history/${id}`, { method: "DELETE" });
      if (!response.ok) {
        return;
      }

      setRecentSearches((current) => current.filter((item) => item.id !== id));
    } catch (error) {
      console.error("Error deleting recent search:", error);
    }
  };

  const handleClearRecentSearches = async () => {
    try {
      const response = await fetch("/api/search/history/clear", { method: "DELETE" });
      if (!response.ok) {
        return;
      }

      setRecentSearches([]);
    } catch (error) {
      console.error("Error clearing recent searches:", error);
    }
  };

  const formattedQuery = query || "Everything";

  const fetchSuggestions = async (prefix: string) => {
    const trimmed = prefix.trim();

    if (trimmed.length === 1) {
      setSuggestions([]);
      return;
    }

    setIsSuggestionsLoading(true);

    try {
      const params = new URLSearchParams({ q: trimmed });
      const response = await fetch(`/api/search/suggestions?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Failed to fetch search suggestions");
      }

      setSuggestions(Array.isArray(data?.data) ? data.data : []);
    } catch (error) {
      console.error("Error fetching suggestions:", error);
      setSuggestions([]);
    } finally {
      setIsSuggestionsLoading(false);
    }
  };

  useEffect(() => {
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      fetchSuggestions("");
      return;
    }

    if (trimmedQuery.length < 2) {
      setSuggestions([]);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void fetchSuggestions(trimmedQuery);
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [query]);

  const handleSuggestionClick = async (suggestion: string) => {
    const nextParams = new URLSearchParams(searchParams.toString());
    const nextValue = suggestion.trim();

    if (nextValue) {
      nextParams.set("q", nextValue);
    } else {
      nextParams.delete("q");
    }

    if (isAdvancedMode) {
      nextParams.set("mode", "advanced");
    } else {
      nextParams.delete("mode");
    }

    nextParams.delete("page");
    setPage(1);
    setSuggestions([]);
    router.push(`/search?${nextParams.toString()}`);

    if (nextValue) {
      await saveRecentSearch(nextValue, {
        q: nextValue,
        mode: isAdvancedMode ? "advanced" : "simple",
        albumId: albumIdParam || undefined,
        from: fromParam || undefined,
        to: toParam || undefined,
        types: typesParam || undefined,
        mood: moodParam || undefined,
        tagIds: tagIdsParam || undefined,
      });

      const historyResponse = await fetch("/api/search/history");
      const historyData = await historyResponse.json();

      if (historyResponse.ok) {
        setRecentSearches(historyData?.data ?? []);
      }
    }
  };

  return (
    <LeftPanelLayout>
      <div className="flex min-h-full flex-col bg-gray-50">
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="mb-4 flex items-center gap-3">
          <Link href="/albums" className="rounded-full p-2 text-gray-500 hover:bg-gray-100">
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Search memories</h1>
        </div>

        <form onSubmit={handleSubmitSearch} className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-3.5 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(event) => handleFilterChange({ q: event.target.value })}
              onFocus={() => {
                if (!query.trim()) {
                  void fetchSuggestions("");
                }
              }}
              onBlur={() => {
                window.setTimeout(() => setSuggestions([]), 150);
              }}
              placeholder={
                isAdvancedMode
                  ? "Example: (apple OR banana) AND \"happy birthday\""
                  : "Search memories, notes, captions..."
              }
              className="w-full rounded-full border border-gray-200 bg-gray-100 py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            {(isSuggestionsLoading || suggestions.length > 0) && (
              <div className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg">
                {isSuggestionsLoading ? (
                  <div className="px-4 py-3 text-sm text-gray-500">Loading suggestions...</div>
                ) : (
                  suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => void handleSuggestionClick(suggestion)}
                      className="flex w-full items-center gap-2 border-b border-gray-100 px-4 py-3 text-left text-sm text-gray-700 transition hover:bg-gray-50 last:border-b-0"
                    >
                      <Search size={14} className="text-gray-400" />
                      <span className="truncate">{suggestion}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <button
            type="submit"
            className="rounded-full bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
          >
            Search
          </button>

          <label className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700">
            <input
              type="checkbox"
              checked={isAdvancedMode}
              onChange={(event) => {
                const nextMode = event.target.checked ? "advanced" : "simple";
                const params = new URLSearchParams(searchParams.toString());
                if (nextMode === "advanced") {
                  params.set("mode", "advanced");
                } else {
                  params.delete("mode");
                }
                router.push(`/search?${params.toString()}`);
              }}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            Advanced mode
          </label>

          <div className="flex flex-col gap-3 sm:flex-row">
            <select
              value={currentAlbumId || ""}
              onChange={(event) => handleFilterChange({ albumId: event.target.value })}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All albums</option>
              {albums.map((album) => (
                <option key={album.id} value={album.id}>
                  {album.name}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
              <CalendarRange size={16} className="text-gray-500" />
              <input
                type="date"
                value={fromParam}
                onChange={(event) => handleFilterChange({ from: event.target.value })}
                className="bg-transparent outline-none"
              />
            </div>

            <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
              <CalendarRange size={16} className="text-gray-500" />
              <input
                type="date"
                value={toParam}
                onChange={(event) => handleFilterChange({ to: event.target.value })}
                className="bg-transparent outline-none"
              />
            </div>
          </div>
        </form>
      </div>

      {isAdvancedMode && (
        <div className="border-b border-gray-200 bg-blue-50 px-6 py-3 text-sm text-blue-800">
          Advanced syntax: use AND, OR, NOT, parentheses, phrases like "happy birthday", and regex like /h[a-z]+/i.
        </div>
      )}

      <div className="flex flex-1 overflow-hidden p-6">
        <div className="mr-6 w-full max-w-sm shrink-0 space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-700">Recent searches</h2>
              {recentSearches.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearRecentSearches}
                  className="text-xs font-medium text-blue-600 hover:text-blue-700"
                >
                  Clear all
                </button>
              )}
            </div>

            {isHistoryLoading ? (
              <p className="text-sm text-gray-500">Loading history...</p>
            ) : recentSearches.length === 0 ? (
              <p className="text-sm text-gray-500">No recent searches yet.</p>
            ) : (
              <ul className="space-y-2">
                {recentSearches.map((item) => (
                  <li key={item.id} className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
                    <button
                      type="button"
                      onClick={() => handleRecentSearchClick(item)}
                      className="flex-1 text-left"
                    >
                      <div className="truncate text-sm font-medium text-gray-800">{item.query}</div>
                      <div className="mt-1 text-[11px] text-gray-500">
                        {new Date(item.createdAt).toLocaleDateString()} · {new Date(item.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteRecentSearch(item.id)}
                      aria-label={`Delete recent search: ${item.query}`}
                      className="rounded-full p-1 text-gray-400 transition hover:bg-gray-200 hover:text-gray-700"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <SearchFilters
            selectedTypes={selectedTypes}
            selectedMood={moodParam}
            selectedTagIds={selectedTagIds}
            moodOptions={moodOptions}
            tagOptions={tagOptions}
            onTypesChange={(nextValues: string[]) => handleFilterChange({ types: nextValues.join(",") })}
            onMoodChange={(value: string) => handleFilterChange({ mood: value })}
            onTagIdsChange={(nextValues: number[]) => handleFilterChange({ tagIds: nextValues.join(",") })}
            onClear={handleClearFilters}
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {isLoading ? "Searching..." : `${total} result${total === 1 ? "" : "s"} for “${formattedQuery}”`}
            </p>
            {(query || typesParam || moodParam || tagIdsParam || albumIdParam || fromParam || toParam) && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                Clear filters
              </button>
            )}
          </div>

          {isLoading ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-gray-500">
              Loading results...
            </div>
          ) : results.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-gray-500">
              No memories match this search.
            </div>
          ) : (
            <div className="space-y-4">
              {results.map((memory) => (
                <Link
                  key={memory.id}
                  href={memory.albumId ? `/album/${memory.albumId}` : `/albums`}
                  className="block rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-blue-200 hover:shadow-md"
                >
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <FolderOpen size={14} />
                      <span>{memory.albumName}</span>
                    </div>
                    <span className="rounded-full bg-gray-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-gray-600">
                      {memory.memoryType}
                    </span>
                  </div>

                  <div className="mb-2 flex items-center gap-2 text-xs text-gray-400">
                    <CalendarRange size={12} />
                    <span>{new Date(memory.memoryDate).toLocaleDateString()}</span>
                  </div>

                  <h2 className="mb-2 text-lg font-semibold text-gray-900">
                    {memory.title || memory.description || "Untitled memory"}
                  </h2>

                  <p className="text-sm leading-6 text-gray-700">
                    {memory.snippet || "No preview available"}
                  </p>
                </Link>
              ))}
            </div>
          )}

          {!isLoading && total > 0 && pageCount > 1 && (
            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page === 1}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600">
                Page {page} of {pageCount}
              </span>
              <button
                type="button"
                onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
                disabled={page >= pageCount}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
      </div>
    </LeftPanelLayout>
  );
}
