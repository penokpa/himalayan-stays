"use client";

import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect } from "react";

const lodgeIcon = L.divIcon({
  className: "lodge-marker",
  html: `
    <div style="
      width: 28px; height: 28px; background: #047857;
      border: 3px solid white; border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg); box-shadow: 0 2px 6px rgba(0,0,0,0.25);
      display: flex; align-items: center; justify-content: center;
    ">
      <span style="transform: rotate(45deg); color: white; font-size: 12px;">⛺</span>
    </div>
  `,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -28],
});

export interface MapLodge {
  id: string;
  name: string;
  slug: string;
  village: string;
  latitude: number;
  longitude: number;
  trailPosition: number;
  altitudeMeters: number | null;
}

function FitBounds({ lodges }: { lodges: MapLodge[] }) {
  const map = useMap();
  useEffect(() => {
    if (lodges.length === 0) return;
    const bounds = L.latLngBounds(
      lodges.map((l) => [l.latitude, l.longitude] as [number, number])
    );
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [lodges, map]);
  return null;
}

export default function TrekRouteMap({ lodges }: { lodges: MapLodge[] }) {
  if (lodges.length === 0) return null;

  // Build trail polyline: one point per village (using first lodge in each village),
  // ordered by trail position
  const villageMap = new Map<string, MapLodge>();
  for (const lodge of [...lodges].sort((a, b) => a.trailPosition - b.trailPosition)) {
    if (!villageMap.has(lodge.village)) villageMap.set(lodge.village, lodge);
  }
  const trailPoints: [number, number][] = Array.from(villageMap.values()).map(
    (l) => [l.latitude, l.longitude]
  );

  const center: [number, number] = [
    lodges[0].latitude,
    lodges[0].longitude,
  ];

  return (
    <MapContainer
      center={center}
      zoom={11}
      scrollWheelZoom={false}
      style={{ height: "400px", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds lodges={lodges} />
      {trailPoints.length >= 2 && (
        <Polyline
          positions={trailPoints}
          pathOptions={{ color: "#047857", weight: 3, dashArray: "6 8" }}
        />
      )}
      {lodges.map((lodge) => (
        <Marker
          key={lodge.id}
          position={[lodge.latitude, lodge.longitude]}
          icon={lodgeIcon}
        >
          <Popup>
            <div style={{ fontWeight: 600 }}>{lodge.name}</div>
            <div style={{ fontSize: 13, color: "#57534e" }}>
              {lodge.village}
              {lodge.altitudeMeters
                ? ` · ${lodge.altitudeMeters.toLocaleString()}m`
                : ""}
            </div>
            <a
              href={`/lodge/${lodge.slug}`}
              style={{
                display: "inline-block",
                marginTop: 6,
                color: "#047857",
                fontSize: 13,
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              View lodge →
            </a>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
