/**
 * Schema.org JSON-LD builders. Each function returns a serializable object
 * to embed via <script type="application/ld+json">{JSON.stringify(...)}</script>.
 * No external library — schema.org is just JSON.
 */

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const SITE_NAME = "Himalayan Stays";

export const AMENITY_LABELS: Record<string, string> = {
  wifi: "Wi-Fi",
  hotShower: "Hot shower",
  charging: "Charging",
  restaurant: "Restaurant",
  bar: "Bar",
  bakery: "Bakery",
  heater: "Heater",
  oxygenAvailable: "Oxygen available",
  garden: "Garden",
  library: "Library",
};

export interface LodgingLodge {
  name: string;
  slug: string;
  description: string | null;
  village: string;
  district: string;
  altitudeMeters: number | null;
  latitude: number | null;
  longitude: number | null;
  amenities: Record<string, boolean> | null;
  photos: string[];
  minPriceNpr: number | null;
  reviews: { rating: number; comment: string | null; createdAt: Date; userName: string }[];
}

export function lodgingBusinessJsonLd(lodge: LodgingLodge) {
  const url = `${SITE_URL}/lodge/${lodge.slug}`;
  const reviewCount = lodge.reviews.length;
  const avgRating =
    reviewCount === 0
      ? null
      : lodge.reviews.reduce((s, r) => s + r.rating, 0) / reviewCount;

  const amenityFeatures =
    lodge.amenities && typeof lodge.amenities === "object"
      ? Object.entries(lodge.amenities)
          .filter(([, v]) => v === true)
          .map(([k]) => ({
            "@type": "LocationFeatureSpecification",
            name: AMENITY_LABELS[k] ?? k,
            value: true,
          }))
      : [];

  // Rounded NPR price → string
  const priceRange = lodge.minPriceNpr
    ? `From NPR ${lodge.minPriceNpr.toLocaleString()}/night`
    : undefined;

  // Google rejects 0-star fake ratings; only emit aggregateRating when we have reviews
  const aggregateRating =
    avgRating && reviewCount > 0
      ? {
          "@type": "AggregateRating",
          ratingValue: avgRating.toFixed(1),
          reviewCount,
          bestRating: 5,
          worstRating: 1,
        }
      : undefined;

  return {
    "@context": "https://schema.org",
    "@type": "LodgingBusiness",
    name: lodge.name,
    description: lodge.description ?? `${lodge.name} — teahouse lodge in ${lodge.village}, Nepal.`,
    url,
    image: lodge.photos.length > 0 ? lodge.photos.slice(0, 6) : undefined,
    address: {
      "@type": "PostalAddress",
      addressLocality: lodge.village,
      addressRegion: lodge.district,
      addressCountry: "NP",
    },
    geo:
      lodge.latitude !== null && lodge.longitude !== null
        ? {
            "@type": "GeoCoordinates",
            latitude: lodge.latitude,
            longitude: lodge.longitude,
            elevation: lodge.altitudeMeters ?? undefined,
          }
        : undefined,
    priceRange,
    amenityFeature: amenityFeatures.length > 0 ? amenityFeatures : undefined,
    aggregateRating,
    review:
      lodge.reviews.length > 0
        ? lodge.reviews.slice(0, 5).map((r) => ({
            "@type": "Review",
            reviewRating: {
              "@type": "Rating",
              ratingValue: r.rating,
              bestRating: 5,
              worstRating: 1,
            },
            author: { "@type": "Person", name: r.userName },
            datePublished: r.createdAt.toISOString().slice(0, 10),
            reviewBody: r.comment ?? undefined,
          }))
        : undefined,
  };
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    description:
      "Multi-lodge teahouse trek booking platform for Nepal — Everest Base Camp, Annapurna, and beyond.",
    address: {
      "@type": "PostalAddress",
      addressCountry: "NP",
    },
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/treks?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export interface TouristTripStop {
  name: string;
  village: string;
  altitudeMeters: number | null;
  slug: string;
}

export function touristTripJsonLd(args: {
  routeName: string;
  routeSlug: string;
  description: string;
  stops: TouristTripStop[];
}) {
  const url = `${SITE_URL}/treks/${args.routeSlug}`;
  return {
    "@context": "https://schema.org",
    "@type": "TouristTrip",
    name: args.routeName,
    description: args.description,
    url,
    touristType: ["Trekkers", "Adventure travellers"],
    itinerary: args.stops.map((s, i) => ({
      "@type": "Place",
      name: s.name,
      url: `${SITE_URL}/lodge/${s.slug}`,
      position: i + 1,
      geo: s.altitudeMeters
        ? {
            "@type": "GeoCoordinates",
            elevation: s.altitudeMeters,
          }
        : undefined,
    })),
  };
}

/** Helper to JSON.stringify cleanly, dropping undefined deep. */
export function ldJson(obj: unknown): string {
  return JSON.stringify(obj);
}
