"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { MapPin } from "lucide-react";
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

type MapMemory = {
  id: number;
  title?: string | null;
  description?: string | null;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  memoryType: string;
  memoryDate: string;
};

export default function LocationMapPage() {
  const [memories, setMemories] = useState<MapMemory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMemories = async () => {
      try {
        const response = await fetch("/api/memories?withLocation=true");
        const data = await response.json();
        setMemories(Array.isArray(data?.data) ? data.data : []);
      } catch (error) {
        console.error("Error loading location memories:", error);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchMemories();
  }, []);

  const validMemories = memories.filter((memory) =>
    memory.location && typeof memory.latitude === "number" && typeof memory.longitude === "number"
  );

  const center = validMemories.length > 0
    ? [validMemories[0].latitude as number, validMemories[0].longitude as number]
    : [20, 0];

  return (
    <div className="flex h-full w-full flex-col bg-gray-50 p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Map view</p>
          <h1 className="text-2xl font-semibold text-gray-900">Your memories by location</h1>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
          <MapPin size={14} className="text-blue-600" />
          {validMemories.length} places
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white text-sm text-gray-500">
          Loading map...
        </div>
      ) : validMemories.length === 0 ? (
        <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white text-sm text-gray-500">
          No memories with saved coordinates yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <MapContainer center={center as [number, number]} zoom={3} scrollWheelZoom className="h-[calc(100vh-150px)] w-full">
            <TileLayer
              attribution="&copy; OpenStreetMap contributors"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {validMemories.map((memory) => {
              const latitude = memory.latitude as number;
              const longitude = memory.longitude as number;

              return (
                <CircleMarker
                  key={memory.id}
                  center={[latitude, longitude]}
                  radius={8}
                  pathOptions={{ color: "#2563eb", fillColor: "#93c5fd", fillOpacity: 0.75 }}
                >
                  <Popup>
                    <div className="space-y-2 text-sm text-gray-700">
                      <div className="font-semibold text-gray-900">{memory.title || memory.memoryType}</div>
                      <div>{memory.location}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(memory.memoryDate).toLocaleDateString()}
                      </div>
                      <Link
                        href="/chats"
                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700"
                      >
                        View memory
                      </Link>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}
          </MapContainer>
        </div>
      )}
    </div>
  );
}
