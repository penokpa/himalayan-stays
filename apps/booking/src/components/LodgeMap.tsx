"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icon paths (Leaflet expects them at root, but Next bundles them)
// Using inline data-URI markers instead of patching paths.
const lodgeIcon = L.divIcon({
  className: "lodge-marker",
  html: `
    <div style="
      width: 32px; height: 32px; background: #047857;
      border: 3px solid white; border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg); box-shadow: 0 2px 6px rgba(0,0,0,0.25);
      display: flex; align-items: center; justify-content: center;
    ">
      <span style="
        transform: rotate(45deg); color: white; font-size: 14px;
      ">⛺</span>
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

interface LodgeMapProps {
  lat: number;
  lng: number;
  name: string;
  village: string;
  altitudeMeters?: number | null;
}

export default function LodgeMap({
  lat,
  lng,
  name,
  village,
  altitudeMeters,
}: LodgeMapProps) {
  return (
    <MapContainer
      center={[lat, lng]}
      zoom={13}
      scrollWheelZoom={false}
      style={{ height: "320px", width: "100%", borderRadius: "0.75rem" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={[lat, lng]} icon={lodgeIcon}>
        <Popup>
          <div style={{ fontWeight: 600 }}>{name}</div>
          <div style={{ fontSize: 13, color: "#57534e" }}>
            {village}
            {altitudeMeters
              ? ` · ${altitudeMeters.toLocaleString()}m`
              : ""}
          </div>
        </Popup>
      </Marker>
    </MapContainer>
  );
}
