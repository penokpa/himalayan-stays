export const dynamic = "force-dynamic";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SLUG_TO_ROUTE } from "@/lib/trek-routes";
import TrekRouteMap from "@/components/TrekRouteMapClient";
import TrekFilters from "@/components/TrekFilters";
import VillageLodgeGrid, { type VillageLodge } from "@/components/VillageLodgeGrid";
import TrailElevationChart from "@/components/TrailElevationChart";
import { touristTripJsonLd, ldJson } from "@/lib/structured-data";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ route: string }>;
}) {
  const { route } = await params;
  const info = SLUG_TO_ROUTE[route];
  if (!info) return { title: "Not Found" };
  const count = await prisma.lodge.count({
    where: { trekRoute: info.key, isActive: true },
  });
  const tagline =
    count > 0
      ? `${count} lodges along the trail · book multi-lodge itineraries`
      : "Coming soon — be the first to plan a trek on this route";
  const description = `${info.name} trek booking on Himalayan Stays. ${tagline}.`;
  const ogImage = `https://picsum.photos/seed/trek-${route}/1200/630`;
  return {
    title: `${info.name} Lodges`,
    description,
    openGraph: {
      title: `${info.name} — ${tagline}`,
      description,
      type: "website",
      url: `/treks/${route}`,
      images: [{ url: ogImage, width: 1200, height: 630, alt: info.name }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${info.name} — ${tagline}`,
      description,
      images: [ogImage],
    },
  };
}

export default async function RouteLodgesPage({
  params,
  searchParams,
}: {
  params: Promise<{ route: string }>;
  searchParams: Promise<{
    amenity?: string | string[];
    maxAltitude?: string;
    maxPrice?: string;
    minRating?: string;
  }>;
}) {
  const { route } = await params;
  const info = SLUG_TO_ROUTE[route];
  if (!info) notFound();

  const sp = await searchParams;
  const filterAmenities = Array.isArray(sp.amenity)
    ? sp.amenity
    : sp.amenity
      ? [sp.amenity]
      : [];
  const filterMaxAltitude = sp.maxAltitude ? Number(sp.maxAltitude) : null;
  const filterMaxPrice = sp.maxPrice ? Number(sp.maxPrice) : null;
  const filterMinRating = sp.minRating ? Number(sp.minRating) : null;

  const allLodges = await prisma.lodge.findMany({
    where: { trekRoute: info.key, isActive: true },
    orderBy: { trailPosition: "asc" },
    include: {
      rooms: {
        where: { isActive: true },
        select: { id: true, basePriceNpr: true },
      },
      reviews: { select: { rating: true } },
    },
  });

  // Per-amenity counts for the unfiltered set (so the filter UI shows availability)
  const amenityCounts: Record<string, number> = {};
  for (const lodge of allLodges) {
    const amenities = (lodge.amenities ?? {}) as Record<string, boolean>;
    for (const [k, v] of Object.entries(amenities)) {
      if (v) amenityCounts[k] = (amenityCounts[k] ?? 0) + 1;
    }
  }

  // Apply filters
  const lodges = allLodges.filter((lodge) => {
    const amenities = (lodge.amenities ?? {}) as Record<string, boolean>;

    if (filterAmenities.length > 0) {
      for (const a of filterAmenities) {
        if (!amenities[a]) return false;
      }
    }
    if (filterMaxAltitude !== null && lodge.altitudeMeters !== null) {
      if (lodge.altitudeMeters > filterMaxAltitude) return false;
    }
    if (filterMaxPrice !== null && lodge.rooms.length > 0) {
      const minRoomPrice = Math.min(...lodge.rooms.map((r) => Number(r.basePriceNpr)));
      if (minRoomPrice > filterMaxPrice) return false;
    }
    if (filterMinRating !== null && lodge.reviews.length > 0) {
      const avg = lodge.reviews.reduce((s, r) => s + r.rating, 0) / lodge.reviews.length;
      if (avg < filterMinRating) return false;
    } else if (filterMinRating !== null && lodge.reviews.length === 0) {
      // No reviews => unknown rating, exclude when min rating filter active
      return false;
    }
    return true;
  });

  // Group lodges by village (preserving trail order)
  const villages: { name: string; altitude: number | null; lodges: typeof lodges }[] = [];
  for (const lodge of lodges) {
    const existing = villages.find((v) => v.name === lodge.village);
    if (existing) {
      existing.lodges.push(lodge);
    } else {
      villages.push({
        name: lodge.village,
        altitude: lodge.altitudeMeters,
        lodges: [lodge],
      });
    }
  }

  // Build trek-route JSON-LD from the (filtered) lodge set
  const tripStops = villages
    .map((v) => v.lodges[0])
    .filter(Boolean)
    .map((l) => ({
      name: l.name,
      village: l.village,
      altitudeMeters: l.altitudeMeters,
      slug: l.slug,
    }));
  const tripJsonLd =
    tripStops.length > 0
      ? touristTripJsonLd({
          routeName: info.name,
          routeSlug: route,
          description: `${info.name} trek with ${lodges.length} lodges across ${villages.length} stops along the trail.`,
          stops: tripStops,
        })
      : null;

  return (
    <main className="min-h-screen bg-stone-50 dark:bg-stone-950">
      {tripJsonLd && (
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: ldJson(tripJsonLd) }}
        />
      )}
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <Link
          href="/treks"
          className="text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400"
        >
          &larr; All Trek Routes
        </Link>

        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl dark:text-stone-100">
              {info.name}
            </h1>
            <p className="mt-2 text-stone-600 dark:text-stone-300">
              {lodges.length} {lodges.length === 1 ? "lodge" : "lodges"}
              {lodges.length !== allLodges.length && (
                <span className="text-stone-400 dark:text-stone-500"> (of {allLodges.length})</span>
              )}{" "}
              across {villages.length} stops along the trail.
            </p>
          </div>
          <Link
            href={`/treks/${route}/book`}
            className="inline-flex items-center justify-center rounded-lg bg-emerald-700 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 sm:shrink-0"
          >
            Book This Trek
          </Link>
        </div>

        {/* Filters */}
        {allLodges.length > 0 && (
          <div className="mt-6">
            <TrekFilters
              trekSlug={route}
              resultCount={lodges.length}
              totalCount={allLodges.length}
              amenityCounts={amenityCounts}
            />
          </div>
        )}

        {allLodges.length === 0 ? (
          <div className="mt-12 rounded-lg border border-dashed border-stone-300 p-12 text-center text-stone-500 dark:border-stone-700 dark:text-stone-400">
            No lodges listed for this route yet. Check back soon!
          </div>
        ) : lodges.length === 0 ? (
          <div className="mt-12 rounded-lg border border-dashed border-amber-300 bg-amber-50 p-12 text-center dark:border-amber-800 dark:bg-amber-950/30">
            <p className="font-medium text-amber-900 dark:text-amber-200">No lodges match these filters.</p>
            <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">
              Try removing some filters to see more options.
            </p>
          </div>
        ) : (
          <>
            {/* Trail map */}
            <section className="mt-10 overflow-hidden rounded-xl ring-1 ring-stone-200">
              <TrekRouteMap
                lodges={lodges
                  .filter((l) => l.latitude !== null && l.longitude !== null)
                  .map((l) => ({
                    id: l.id,
                    name: l.name,
                    slug: l.slug,
                    village: l.village,
                    latitude: Number(l.latitude),
                    longitude: Number(l.longitude),
                    trailPosition: l.trailPosition,
                    altitudeMeters: l.altitudeMeters,
                  }))}
              />
            </section>

            {/* Elevation profile */}
            {(() => {
              const villageElevations = villages
                .filter((v) => v.altitude !== null)
                .map((v) => ({
                  name: v.name,
                  altitude: v.altitude as number,
                  trailPosition: v.lodges[0]?.trailPosition ?? 0,
                }));
              if (villageElevations.length < 2) return null;
              return (
                <section className="mt-6">
                  <TrailElevationChart villages={villageElevations} />
                </section>
              );
            })()}
          </>
        )}
        {lodges.length > 0 && (
          <div className="mt-10 space-y-10">
            {villages.map((village, vi) => (
              <section key={village.name}>
                {/* Village header with trail connector */}
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-sm font-bold text-white">
                    {vi + 1}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">
                      {village.name}
                    </h2>
                    <p className="text-sm text-stone-500 dark:text-stone-400">
                      {village.altitude
                        ? `${village.altitude.toLocaleString()}m`
                        : ""}
                      {" · "}
                      {village.lodges.length}{" "}
                      {village.lodges.length === 1 ? "lodge" : "lodges"}{" "}
                      available
                    </p>
                  </div>
                </div>

                {/* Lodge cards for this village */}
                <VillageLodgeGrid
                  villageName={village.name}
                  lodges={village.lodges.map<VillageLodge>((lodge) => {
                    const roomCount = lodge.rooms.length;
                    const minPriceNpr =
                      roomCount > 0
                        ? Math.min(...lodge.rooms.map((r) => Number(r.basePriceNpr)))
                        : null;
                    const reviewCount = lodge.reviews.length;
                    const avgRating =
                      reviewCount === 0
                        ? null
                        : lodge.reviews.reduce((s, r) => s + r.rating, 0) / reviewCount;
                    return {
                      id: lodge.id,
                      name: lodge.name,
                      slug: lodge.slug,
                      description: lodge.description,
                      photo: lodge.photos[0] ?? null,
                      roomCount,
                      minPriceNpr,
                      avgRating,
                      reviewCount,
                      amenities: (lodge.amenities ?? null) as Record<string, boolean> | null,
                      trailPosition: lodge.trailPosition,
                    };
                  })}
                />

                {/* Trail connector between villages */}
                {vi < villages.length - 1 && (
                  <div className="ml-5 flex h-6 items-center">
                    <div className="h-full w-0.5 bg-emerald-200" />
                  </div>
                )}
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
