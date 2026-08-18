"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { LocateFixed, MapPin, Search, X } from "lucide-react";
import "leaflet/dist/leaflet.css";

const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);
const CircleMarker = dynamic(
  () => import("react-leaflet").then((mod) => mod.CircleMarker),
  { ssr: false }
);
const Popup = dynamic(
  () => import("react-leaflet").then((mod) => mod.Popup),
  { ssr: false }
);

type GeocodeResult = {
  display_name: string;
  lat: number;
  lon: number;
};

type SelectedLocation = {
  location: string;
  latitude: number;
  longitude: number;
};

interface LocationPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (location: SelectedLocation) => void;
}

const MapClickEvents = dynamic(
  async () => {
    const leaflet = await import("react-leaflet");

    return function MapClickEvents({ onSelect }: { onSelect: (point: { lat: number; lng: number }) => void }) {
      leaflet.useMapEvents({
        click(event: { latlng: { lat: number; lng: number } }) {
          onSelect({ lat: event.latlng.lat, lng: event.latlng.lng });
        },
      });

      return null;
    };
  },
  { ssr: false }
);

function MapClickHandler({ onSelect }: { onSelect: (point: { lat: number; lng: number }) => void }) {
  return <MapClickEvents onSelect={onSelect} />;
}

export default function LocationPickerModal({ isOpen, onClose, onSelect }: LocationPickerModalProps) {
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GeocodeResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<SelectedLocation | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([20, 0]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setQuery("");
    setSearchResults([]);
    setSelectedResult(null);
    setGeoError(null);
    setMapCenter([20, 0]);

    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setMapCenter([latitude, longitude]);
          void reverseGeocode(latitude, longitude);
        },
        () => {
          setGeoError("Location access is unavailable right now. You can still search manually or pick a spot on the map.");
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  }, [isOpen]);

  const reverseGeocode = async (lat: number, lon: number) => {
    try {
      const response = await fetch(`/api/geocode/reverse?lat=${lat}&lon=${lon}`);
      const data = await response.json();
      const displayName = typeof data?.display_name === "string" ? data.display_name : `${lat}, ${lon}`;
      setSelectedResult({ location: displayName, latitude: lat, longitude: lon });
      setMapCenter([lat, lon]);
    } catch (error) {
      console.error("Reverse geocode failed:", error);
      setSelectedResult({ location: `${lat.toFixed(4)}, ${lon.toFixed(4)}`, latitude: lat, longitude: lon });
    }
  };

  useEffect(() => {
    if (!isOpen || query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      try {
        setIsSearching(true);
        const response = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
        const data = (await response.json()) as GeocodeResult[];
        setSearchResults(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Failed to fetch geocode results:", error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [query, isOpen]);

  const selectedResultLabel = useMemo(() => {
    if (!selectedResult) {
      return "Pick a location";
    }

    return selectedResult.location;
  }, [selectedResult]);

  const handleMapPick = async (point: { lat: number; lng: number }) => {
    setMapCenter([point.lat, point.lng]);
    await reverseGeocode(point.lat, point.lng);
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported in this browser.");
      return;
    }

    setIsLoadingLocation(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        await reverseGeocode(latitude, longitude);
        setMapCenter([latitude, longitude]);
        setIsLoadingLocation(false);
      },
      (error) => {
        setIsLoadingLocation(false);
        if (error.code === error.PERMISSION_DENIED) {
          setGeoError("Location permission was denied. You can still search or pick a location manually.");
          return;
        }
        setGeoError("Unable to determine your current location right now.");
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const handleConfirm = () => {
    if (!selectedResult) {
      return;
    }

    onSelect(selectedResult);
    onClose();
  };

  const mapView = useMemo(
    () => (
      <MapContainer center={mapCenter} zoom={10} scrollWheelZoom className="h-[340px] w-full">
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapClickHandler onSelect={handleMapPick} />
        {selectedResult && (
          <CircleMarker center={[selectedResult.latitude, selectedResult.longitude]} radius={10} pathOptions={{ color: "#2563eb", fillColor: "#60a5fa", fillOpacity: 0.9 }}>
            <Popup>{selectedResult.location}</Popup>
          </CircleMarker>
        )}
      </MapContainer>
    ),
    [handleMapPick, mapCenter, selectedResult]
  );

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
      <div className="w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Add location</p>
            <h3 className="text-lg font-semibold text-gray-900">Choose a place</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            aria-label="Close location picker"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-6 p-5 lg:grid-cols-[1.1fr_1.5fr]">
          <div className="space-y-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-3 text-gray-400" size={16} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search for a place..."
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={isLoadingLocation}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
            >
              <LocateFixed size={16} />
              {isLoadingLocation ? "Finding your location..." : "Use current location"}
            </button>

            {geoError && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                {geoError}
              </div>
            )}

            <div className="max-h-72 space-y-2 overflow-auto">
              {isSearching ? (
                <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-600">
                  Searching places...
                </div>
              ) : searchResults.length > 0 ? (
                searchResults.map((result) => (
                  <button
                    key={`${result.display_name}-${result.lat}-${result.lon}`}
                    type="button"
                    onClick={() => {
                      setSelectedResult({
                        location: result.display_name,
                        latitude: result.lat,
                        longitude: result.lon,
                      });
                      setMapCenter([result.lat, result.lon]);
                    }}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-left transition hover:border-blue-200 hover:bg-blue-50"
                  >
                    <div className="flex items-start gap-2">
                      <MapPin size={16} className="mt-0.5 text-blue-600" />
                      <span className="text-sm text-gray-700">{result.display_name}</span>
                    </div>
                  </button>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-3 py-4 text-sm text-gray-500">
                  Search a city, landmark, or address.
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-gray-100">
              {mapView}
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Selected location</p>
              <p className="mt-2 text-sm font-medium text-gray-800">{selectedResultLabel}</p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={!selectedResult}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
              >
                Confirm location
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
