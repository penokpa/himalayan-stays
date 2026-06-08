export const dynamic = "force-dynamic";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import LodgeMap from "@/components/LodgeMapClient";
import LodgeGallery from "@/components/LodgeGallery";
import Money from "@/components/Money";
import WishlistButton from "@/components/WishlistButton";
import AvailabilityChecker from "@/components/AvailabilityChecker";
import AvailabilityCalendar from "@/components/AvailabilityCalendar";
import {
  getRoomAvailability,
  getRecentBookingCount,
  getMonthAvailability,
} from "@/lib/availability";
import { lodgingBusinessJsonLd, ldJson } from "@/lib/structured-data";
import AskLodgeForm from "@/components/AskLodgeForm";
import CompareButton from "@/components/CompareButton";

const ROOM_TYPE_LABELS: Record<string, string> = {
  PRIVATE_SINGLE: "Private Single",
  PRIVATE_DOUBLE: "Private Double",
  PRIVATE_TWIN: "Private Twin",
  DORM: "Dormitory",
};

const ROUTE_NAME_FOR_LODGE: Record<string, string> = {
  EBC: "Everest Base Camp",
  ABC: "Annapurna Base Camp",
  LANGTANG: "Langtang",
  MANASLU: "Manaslu",
  UPPER_MUSTANG: "Upper Mustang",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const lodge = await prisma.lodge.findUnique({
    where: { slug },
    select: {
      name: true,
      village: true,
      district: true,
      altitudeMeters: true,
      description: true,
      photos: true,
      rooms: { where: { isActive: true }, select: { basePriceNpr: true } },
    },
  });
  if (!lodge) return { title: "Not Found" };
  const minPrice =
    lodge.rooms.length > 0
      ? Math.min(...lodge.rooms.map((r) => Number(r.basePriceNpr)))
      : null;
  const altText = lodge.altitudeMeters
    ? `${lodge.altitudeMeters.toLocaleString()}m elevation`
    : "";
  const tagline = [lodge.village, lodge.district, altText]
    .filter(Boolean)
    .join(" · ");
  const description =
    lodge.description ??
    `${lodge.name} in ${lodge.village}${minPrice ? ` — rooms from NPR ${minPrice.toLocaleString()}/night` : ""}.`;
  const title = `${lodge.name}, ${lodge.village}`;
  const ogImage = lodge.photos[0];
  return {
    title,
    description,
    openGraph: {
      title: `${title} — ${tagline}`,
      description,
      type: "website",
      url: `/lodge/${slug}`,
      images: ogImage
        ? [{ url: ogImage, width: 1200, height: 630, alt: lodge.name }]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} — ${tagline}`,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
  };
}

export default async function LodgeDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ from?: string; to?: string; month?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;

  const lodge = await prisma.lodge.findUnique({
    where: { slug },
    include: {
      rooms: {
        where: { isActive: true },
        orderBy: { basePriceNpr: "asc" },
      },
      reviews: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          rating: true,
          comment: true,
          createdAt: true,
          ownerReply: true,
          ownerReplyAt: true,
          user: { select: { name: true, nationality: true } },
        },
      },
    },
  });

  if (!lodge || !lodge.isActive) notFound();

  const amenities: string[] = Array.isArray(lodge.amenities)
    ? (lodge.amenities as string[])
    : [];
  const reviewCount = lodge.reviews.length;
  const avgRating =
    reviewCount === 0
      ? null
      : lodge.reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount;

  // Availability + booking velocity
  const fromIso = sp.from && /^\d{4}-\d{2}-\d{2}$/.test(sp.from) ? sp.from : null;
  const toIso = sp.to && /^\d{4}-\d{2}-\d{2}$/.test(sp.to) ? sp.to : null;
  const datesPicked = !!(fromIso && toIso);
  const fromDate = fromIso ? new Date(fromIso) : new Date();
  const toDate = toIso
    ? new Date(toIso)
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  // Calendar month — defaults to ?from's month if set, else current month
  const monthParam = sp.month && /^\d{4}-\d{2}$/.test(sp.month) ? sp.month : null;
  const calendarBaseIso = monthParam
    ? `${monthParam}-01`
    : (fromIso ?? new Date().toISOString().slice(0, 10));
  const calendarYear = Number(calendarBaseIso.slice(0, 4));
  const calendarMonth = Number(calendarBaseIso.slice(5, 7)) - 1;

  const [availability, recentBookings, monthAvailability, similarLodges] =
    await Promise.all([
      getRoomAvailability(lodge.id, fromDate, toDate),
      getRecentBookingCount(lodge.id, 30),
      getMonthAvailability(lodge.id, calendarYear, calendarMonth),
      prisma.lodge.findMany({
        where: {
          isActive: true,
          trekRoute: lodge.trekRoute,
          id: { not: lodge.id },
        },
        include: {
          rooms: { where: { isActive: true }, select: { basePriceNpr: true } },
          reviews: { select: { rating: true } },
        },
      }),
    ]);

  // Rank by trail-position proximity to the current lodge, take top 3
  const ranked = similarLodges
    .map((l) => ({ lodge: l, distance: Math.abs(l.trailPosition - lodge.trailPosition) }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 3)
    .map((x) => x.lodge);
  const availableCount = Array.from(availability.values()).filter(
    (v) => v === "available"
  ).length;

  // Build JSON-LD for rich Google results
  const minRoomPrice =
    lodge.rooms.length > 0
      ? Math.min(...lodge.rooms.map((r) => Number(r.basePriceNpr)))
      : null;
  const jsonLd = lodgingBusinessJsonLd({
    name: lodge.name,
    slug: lodge.slug,
    description: lodge.description,
    village: lodge.village,
    district: lodge.district,
    altitudeMeters: lodge.altitudeMeters,
    latitude: lodge.latitude,
    longitude: lodge.longitude,
    amenities: lodge.amenities as Record<string, boolean> | null,
    photos: lodge.photos,
    minPriceNpr: minRoomPrice,
    reviews: lodge.reviews.map((r) => ({
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt,
      userName: r.user.name,
    })),
  });

  return (
    <main className="min-h-screen bg-stone-50 dark:bg-stone-950">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: ldJson(jsonLd) }}
      />
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <Link
          href="/treks"
          className="text-sm font-medium text-emerald-700 hover:underline"
        >
          &larr; Back to treks
        </Link>

        {/* Header */}
        <div className="mt-6">
          {lodge.photos.length > 0 ? (
            <LodgeGallery photos={lodge.photos} alt={lodge.name} />
          ) : (
            <div className="flex h-64 w-full items-center justify-center rounded-xl bg-stone-200 text-stone-400 sm:h-80 dark:bg-stone-800 dark:text-stone-500">
              <svg
                className="h-16 w-16"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 0h.008v.008h-.008V7.5Z"
                />
              </svg>
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
              {lodge.name}
            </h1>
            <WishlistButton slug={lodge.slug} variant="inline" />
            <CompareButton slug={lodge.slug} variant="inline" />
            {avgRating !== null && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-sm font-semibold text-amber-700 ring-1 ring-amber-200">
                <svg className="h-4 w-4 fill-amber-400" viewBox="0 0 20 20">
                  <path d="M9.05 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.539 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.539-1.118l1.519-4.674a1 1 0 00-.363-1.118L2.075 10.1c-.783-.57-.38-1.81.588-1.81h4.915a1 1 0 00.95-.69l1.519-4.674z" />
                </svg>
                {avgRating.toFixed(1)}
                <span className="font-normal text-amber-600">
                  ({reviewCount} {reviewCount === 1 ? "review" : "reviews"})
                </span>
              </span>
            )}
          </div>
          <p className="mt-2 text-stone-500 dark:text-stone-400">
            {lodge.village}, {lodge.district}
            {lodge.altitudeMeters &&
              ` · ${lodge.altitudeMeters.toLocaleString()}m elevation`}
          </p>

          {lodge.description && (
            <p className="mt-4 leading-relaxed text-stone-700 dark:text-stone-200">
              {lodge.description}
            </p>
          )}
        </div>

        {/* Map */}
        {lodge.latitude !== null && lodge.longitude !== null && (
          <section className="mt-10">
            <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">Location</h2>
            <div className="mt-3 overflow-hidden rounded-xl ring-1 ring-stone-200">
              <LodgeMap
                lat={Number(lodge.latitude)}
                lng={Number(lodge.longitude)}
                name={lodge.name}
                village={lodge.village}
                altitudeMeters={lodge.altitudeMeters}
              />
            </div>
          </section>
        )}

        {/* Amenities */}
        {amenities.length > 0 && (
          <section className="mt-10">
            <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">Amenities</h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {amenities.map((amenity) => (
                <li
                  key={amenity}
                  className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                >
                  {amenity}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Rooms */}
        <section className="mt-10">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
              {datesPicked ? "Availability" : "Available Rooms"}
            </h2>
            {recentBookings > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-medium text-rose-700 ring-1 ring-rose-200">
                🔥 Booked {recentBookings}{" "}
                {recentBookings === 1 ? "time" : "times"} in the last 30 days
              </span>
            )}
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
            <div className="rounded-xl bg-white p-4 ring-1 ring-stone-200 dark:bg-stone-900 dark:ring-stone-800">
              <p className="text-xs font-medium uppercase tracking-wider text-stone-400 dark:text-stone-500">
                Pick your dates
              </p>
              <div className="mt-2">
                <AvailabilityChecker lodgeSlug={lodge.slug} />
              </div>
              {datesPicked && (
                <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">
                  {availableCount === 0
                    ? "All rooms booked for these dates."
                    : `${availableCount} of ${lodge.rooms.length} ${
                        lodge.rooms.length === 1 ? "room" : "rooms"
                      } available.`}
                </p>
              )}
            </div>
            <div className="rounded-xl bg-white p-4 ring-1 ring-stone-200 dark:bg-stone-900 dark:ring-stone-800">
              <p className="text-xs font-medium uppercase tracking-wider text-stone-400 dark:text-stone-500">
                Availability calendar
              </p>
              <div className="mt-2">
                <AvailabilityCalendar
                  lodgeSlug={lodge.slug}
                  year={calendarYear}
                  monthIndex={calendarMonth}
                  days={monthAvailability}
                />
              </div>
            </div>
          </div>

          {lodge.rooms.length === 0 ? (
            <p className="mt-3 text-stone-500 dark:text-stone-400">
              No rooms are currently listed.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {(() => {
                // Group physical rooms by type so each "category" card shows
                // X-of-Y capacity and only marks BOOKED when every unit is taken.
                type RoomItem = (typeof lodge.rooms)[number];
                const byType = new Map<string, RoomItem[]>();
                for (const r of lodge.rooms) {
                  const list = byType.get(r.roomType) ?? [];
                  list.push(r);
                  byType.set(r.roomType, list);
                }
                const groups = Array.from(byType.entries()).map(([type, rooms]) => {
                  const availableRooms = rooms.filter(
                    (r) => (availability.get(r.id) ?? "available") === "available"
                  );
                  const minPrice = Math.min(...rooms.map((r) => Number(r.basePriceNpr)));
                  return {
                    type,
                    rooms,
                    availableRooms,
                    total: rooms.length,
                    available: availableRooms.length,
                    capacity: rooms[0].capacity,
                    minPrice,
                  };
                });
                // Sort by price ascending so cheapest type leads
                groups.sort((a, b) => a.minPrice - b.minPrice);

                return groups.map((g) => {
                  const allBooked = datesPicked && g.available === 0;
                  const firstAvailable = g.availableRooms[0];
                  const bookHref =
                    datesPicked && firstAvailable
                      ? `/lodge/${lodge.slug}/book?room=${firstAvailable.id}&checkIn=${fromIso}&checkOut=${toIso}`
                      : !datesPicked
                        ? `/lodge/${lodge.slug}/book?room=${g.rooms[0].id}`
                        : null;
                  const cardClasses = allBooked
                    ? "flex items-center justify-between gap-3 rounded-lg bg-stone-50 p-4 ring-1 ring-stone-200 opacity-70 dark:bg-stone-900/50 dark:ring-stone-800"
                    : "group flex items-center justify-between gap-3 rounded-lg bg-white p-4 shadow-sm ring-1 ring-stone-200 transition hover:ring-2 hover:ring-emerald-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 dark:bg-stone-900 dark:ring-stone-800";

                  const Card = (
                    <>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-stone-900 group-hover:text-emerald-700 dark:text-stone-100 dark:group-hover:text-emerald-400">
                            {ROOM_TYPE_LABELS[g.type] ?? g.type}
                          </p>
                          {datesPicked ? (
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                                allBooked
                                  ? "bg-stone-200 text-stone-600 dark:bg-stone-800 dark:text-stone-300"
                                  : "bg-emerald-100 text-emerald-700"
                              }`}
                            >
                              {allBooked
                                ? "Booked"
                                : `${g.available} of ${g.total} available`}
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-stone-600 dark:bg-stone-800 dark:text-stone-300">
                              {g.total} {g.total === 1 ? "room" : "rooms"}
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-sm text-stone-500 dark:text-stone-400">
                          Sleeps {g.capacity}
                        </p>
                      </div>
                      <div className="shrink-0 whitespace-nowrap text-right">
                        <p className="font-semibold text-emerald-700">
                          <Money npr={g.minPrice} />
                        </p>
                        <p className="text-xs text-stone-400 dark:text-stone-500">per night</p>
                      </div>
                    </>
                  );

                  return bookHref ? (
                    <Link key={g.type} href={bookHref} className={cardClasses}>
                      {Card}
                    </Link>
                  ) : (
                    <div key={g.type} className={cardClasses}>
                      {Card}
                    </div>
                  );
                });
              })()}
            </div>
          )}
        </section>

        {/* Reviews */}
        {reviewCount > 0 && (
          <section className="mt-12">
            <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
              Reviews ({reviewCount})
            </h2>
            <div className="mt-4 space-y-4">
              {lodge.reviews.map((r) => (
                <article
                  key={r.id}
                  className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-stone-200 dark:bg-stone-900 dark:ring-stone-800"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-stone-900 dark:text-stone-100">
                        {r.user.name}
                        {r.user.nationality && (
                          <span className="ml-1 text-sm font-normal text-stone-500 dark:text-stone-400">
                            · {r.user.nationality}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-stone-400 dark:text-stone-500">
                        {new Date(r.createdAt).toLocaleDateString("en-US", {
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <div
                      className="flex shrink-0 items-center gap-0.5"
                      aria-label={`${r.rating} out of 5 stars`}
                    >
                      {[1, 2, 3, 4, 5].map((n) => (
                        <svg
                          key={n}
                          className={`h-4 w-4 ${n <= r.rating ? "fill-amber-400" : "fill-stone-200"}`}
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.05 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.539 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.539-1.118l1.519-4.674a1 1 0 00-.363-1.118L2.075 10.1c-.783-.57-.38-1.81.588-1.81h4.915a1 1 0 00.95-.69l1.519-4.674z" />
                        </svg>
                      ))}
                    </div>
                  </div>
                  {r.comment && (
                    <p className="mt-3 leading-relaxed text-stone-700 dark:text-stone-200">
                      {r.comment}
                    </p>
                  )}
                  {r.ownerReply && (
                    <div className="mt-4 rounded-lg border-l-4 border-emerald-500 bg-emerald-50/50 p-3 dark:border-emerald-500 dark:bg-emerald-950/20">
                      <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                        Response from {lodge.name}
                        {r.ownerReplyAt && (
                          <span className="ml-2 font-normal text-stone-400 dark:text-stone-500">
                            · {new Date(r.ownerReplyAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                          </span>
                        )}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-stone-700 dark:text-stone-200">
                        {r.ownerReply}
                      </p>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}

        {/* Similar lodges */}
        {ranked.length > 0 && (
          <section className="mt-12">
            <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
              Also along this trail
            </h2>
            <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
              Other lodges on the {ROUTE_NAME_FOR_LODGE[lodge.trekRoute] ?? lodge.trekRoute} route, near {lodge.village}.
            </p>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {ranked.map((l) => {
                const photo = l.photos[0] ?? null;
                const minPrice =
                  l.rooms.length > 0
                    ? Math.min(...l.rooms.map((r) => Number(r.basePriceNpr)))
                    : null;
                const reviewCount = l.reviews.length;
                const avg =
                  reviewCount === 0
                    ? null
                    : l.reviews.reduce((s, r) => s + r.rating, 0) / reviewCount;
                return (
                  <Link
                    key={l.id}
                    href={`/lodge/${l.slug}`}
                    className="group overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-stone-200 transition hover:shadow-md hover:ring-emerald-300 dark:bg-stone-900 dark:ring-stone-800"
                  >
                    {photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={photo} alt={l.name} className="h-32 w-full object-cover" />
                    ) : (
                      <div className="h-32 w-full bg-stone-200 dark:bg-stone-800" />
                    )}
                    <div className="px-4 py-3">
                      <h3 className="font-semibold text-stone-900 group-hover:text-emerald-700 dark:text-stone-100 dark:group-hover:text-emerald-400">
                        {l.name}
                      </h3>
                      <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
                        {l.village}
                        {l.altitudeMeters ? ` · ${l.altitudeMeters.toLocaleString()}m` : ""}
                      </p>
                      <div className="mt-2 flex items-center justify-between text-sm">
                        <span className="text-stone-500 dark:text-stone-400">
                          {avg !== null ? (
                            <span className="inline-flex items-center gap-0.5 text-amber-600 dark:text-amber-400">
                              ★ <span className="font-semibold">{avg.toFixed(1)}</span>
                              <span className="text-stone-400 dark:text-stone-500"> ({reviewCount})</span>
                            </span>
                          ) : (
                            <span className="text-xs">No reviews yet</span>
                          )}
                        </span>
                        {minPrice !== null && (
                          <span className="font-medium text-emerald-700 dark:text-emerald-400">
                            From <Money npr={minPrice} />
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Ask the lodge */}
        <section className="mt-12">
          <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
            Have a question?
          </h2>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
            Ask the lodge directly — about availability, the trail, or what to bring. They&apos;ll reply by email.
          </p>
          <div className="mt-3">
            <AskLodgeForm lodgeSlug={lodge.slug} lodgeName={lodge.name} />
          </div>
        </section>

        {/* Book CTA — fallback for users who scroll past rooms */}
        {lodge.rooms.length > 0 && (
          <section className="mt-12">
            <Link
              href={`/lodge/${lodge.slug}/book`}
              className="inline-block rounded-lg bg-emerald-700 px-8 py-3 text-lg font-semibold text-white shadow-sm transition hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
            >
              Book a Room
            </Link>
          </section>
        )}
      </div>
    </main>
  );
}
