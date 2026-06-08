export interface AmenitySpec {
  key: string;
  label: string;
  icon: string;
}

export const AMENITY_SPECS: AmenitySpec[] = [
  { key: "wifi", label: "WiFi", icon: "📶" },
  { key: "hotShower", label: "Hot shower", icon: "🚿" },
  { key: "charging", label: "Charging", icon: "🔌" },
  { key: "restaurant", label: "Restaurant", icon: "🍽️" },
  { key: "bakery", label: "Bakery", icon: "🥐" },
  { key: "heater", label: "Heater", icon: "🔥" },
  { key: "oxygenAvailable", label: "Oxygen", icon: "🫁" },
  { key: "garden", label: "Garden", icon: "🌿" },
  { key: "library", label: "Library", icon: "📚" },
  { key: "bar", label: "Bar", icon: "🍻" },
];

export const AMENITY_LABELS: Record<string, string> = Object.fromEntries(
  AMENITY_SPECS.map((a) => [a.key, a.label])
);

export const AMENITY_ICONS: Record<string, string> = Object.fromEntries(
  AMENITY_SPECS.map((a) => [a.key, a.icon])
);

// Subset of amenities surfaced as quick-toggle chips in per-village toolbars.
export const QUICK_FILTER_AMENITIES: AmenitySpec[] = AMENITY_SPECS.filter((a) =>
  ["wifi", "hotShower", "charging", "heater", "restaurant"].includes(a.key)
);

export function getAmenityChips(
  amenities: Record<string, boolean> | null | undefined,
  limit = 5
): AmenitySpec[] {
  if (!amenities) return [];
  const out: AmenitySpec[] = [];
  for (const spec of AMENITY_SPECS) {
    if (amenities[spec.key]) {
      out.push(spec);
      if (out.length >= limit) break;
    }
  }
  return out;
}
