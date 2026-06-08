export const dynamic = "force-dynamic";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCompare } from "@/lib/compare-server";
import { AMENITY_LABELS } from "@/lib/structured-data";
import { TREK_ROUTES } from "@/lib/trek-routes";
import Money from "@/components/Money";
import CompareRemoveButton from "@/components/CompareRemoveButton";

export const metadata = {
  title: "Compare Lodges | Himalayan Stays",
  robots: { index: false, follow: false },
};

const ROOM_TYPE_LABELS: Record<string, string> = {
  PRIVATE_SINGLE: "Private Single",
  PRIVATE_DOUBLE: "Private Double",
  PRIVATE_TWIN: "Private Twin",
  DORM: "Dormitory",
};

const ROUTE_NAME: Record<string, string> = Object.fromEntries(
  TREK_ROUTES.map((r) => [r.key, r.name])
);

function avgOf(reviews: { rating: number }[]): number | null {
  if (reviews.length === 0) return null;
  return reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
}

function amenityKeys(a: unknown): string[] {
  if (!a || typeof a !== "object") return [];
  return Object.entries(a as Record<string, unknown>)
    .filter(([, v]) => v === true)
    .map(([k]) => k);
}

export default async function ComparePage() {
  const slugs = await getCompare();

  const lodges =
    slugs.length === 0
      ? []
      : await prisma.lodge.findMany({
          where: { slug: { in: slugs }, isActive: true },
          include: {
            rooms: {
              where: { isActive: true },
              orderBy: { basePriceNpr: "asc" },
              select: { name: true, roomType: true, basePriceNpr: true, capacity: true },
            },
            reviews: { select: { rating: true } },
          },
        });

  const ordered = slugs
    .map((s) => lodges.find((l) => l.slug === s))
    .filter((x): x is (typeof lodges)[number] => !!x);

  // Union of amenity keys present anywhere
  const amenityUnion = Array.from(
    new Set(ordered.flatMap((l) => amenityKeys(l.amenities)))
  ).sort();

  // Highlight winners per row
  const minPrices = ordered.map((l) =>
    l.rooms.length > 0 ? Math.min(...l.rooms.map((r) => Number(r.basePriceNpr))) : Infinity
  );
  const cheapestIdx = (() => {
    const m = Math.min(...minPrices);
    return Number.isFinite(m) ? minPrices.indexOf(m) : -1;
  })();
  const ratings = ordered.map((l) => avgOf(l.reviews) ?? -1);
  const bestRatedIdx = (() => {
    const m = Math.max(...ratings);
    return m > 0 ? ratings.indexOf(m) : -1;
  })();
  const altitudes = ordered.map((l) => l.altitudeMeters ?? -1);
  const lowestAltIdx = (() => {
    const positives = altitudes.filter((x) => x > 0);
    if (positives.length === 0) return -1;
    const m = Math.min(...positives);
    return altitudes.indexOf(m);
  })();

  return (
    <main className="min-h-screen bg-stone-50 dark:bg-stone-950">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <Link
          href="/treks"
          className="text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400"
        >
          ← All trek routes
        </Link>

        <div className="mt-4 flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl dark:text-stone-100">
            Compare Lodges
          </h1>
          {ordered.length > 0 && (
            <p className="text-sm text-stone-500 dark:text-stone-400">
              {ordered.length} {ordered.length === 1 ? "lodge" : "lodges"} side by side
            </p>
          )}
        </div>

        {ordered.length === 0 ? (
          <div className="mt-12 rounded-xl border border-dashed border-stone-300 bg-white p-12 text-center dark:border-stone-700 dark:bg-stone-900">
            <p className="text-stone-700 dark:text-stone-200">
              No lodges to compare yet. Tap the <span className="font-semibold">Compare</span> button on any lodge to add it.
            </p>
            <Link
              href="/treks"
              className="mt-4 inline-block rounded-lg bg-emerald-700 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              Browse trek routes
            </Link>
          </div>
        ) : (
          <div className="mt-6 overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-stone-200 dark:bg-stone-900 dark:ring-stone-800">
            <table className="min-w-full divide-y divide-stone-200 text-sm dark:divide-stone-800">
              <thead>
                <tr className="bg-stone-50 dark:bg-stone-900/60">
                  <th className="sticky left-0 z-10 w-44 border-r border-stone-200 bg-stone-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-stone-500 dark:border-stone-800 dark:bg-stone-900/60 dark:text-stone-400">
                    &nbsp;
                  </th>
                  {ordered.map((lodge) => {
                    const photo = lodge.photos[0];
                    return (
                      <th
                        key={lodge.id}
                        className="min-w-[220px] px-4 py-3 text-left align-top"
                      >
                        <div className="relative">
                          <CompareRemoveButton slug={lodge.slug} />
                          {photo ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={photo}
                              alt={lodge.name}
                              className="h-28 w-full rounded-lg object-cover"
                            />
                          ) : (
                            <div className="h-28 w-full rounded-lg bg-stone-200 dark:bg-stone-800" />
                          )}
                          <Link
                            href={`/lodge/${lodge.slug}`}
                            className="mt-2 block font-semibold text-stone-900 hover:text-emerald-700 dark:text-stone-100 dark:hover:text-emerald-400"
                          >
                            {lodge.name}
                          </Link>
                          <p className="text-xs font-normal text-stone-500 dark:text-stone-400">
                            {lodge.village}, {lodge.district}
                          </p>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                <Row
                  label="Trek route"
                  cells={ordered.map((l) => ROUTE_NAME[l.trekRoute] ?? l.trekRoute)}
                />
                <Row
                  label="Altitude"
                  highlight={lowestAltIdx}
                  highlightLabel="Lowest"
                  cells={ordered.map((l) =>
                    l.altitudeMeters ? `${l.altitudeMeters.toLocaleString()}m` : "—"
                  )}
                />
                <Row
                  label="Rating"
                  highlight={bestRatedIdx}
                  highlightLabel="Best rated"
                  cells={ordered.map((l) => {
                    const a = avgOf(l.reviews);
                    return a === null ? (
                      <span className="text-stone-400">No reviews yet</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-amber-600">
                        ★ <span className="font-semibold">{a.toFixed(1)}</span>
                        <span className="text-xs text-stone-400">
                          ({l.reviews.length})
                        </span>
                      </span>
                    );
                  })}
                />
                <Row
                  label="From / night"
                  highlight={cheapestIdx}
                  highlightLabel="Cheapest"
                  cells={ordered.map((l, i) => {
                    if (l.rooms.length === 0) return <span className="text-stone-400">—</span>;
                    return (
                      <span className="font-semibold text-emerald-700">
                        <Money npr={minPrices[i]} />
                      </span>
                    );
                  })}
                />
                <Row
                  label="Rooms"
                  cells={ordered.map((l) =>
                    l.rooms.length === 0 ? (
                      <span className="text-stone-400">—</span>
                    ) : (
                      <ul className="space-y-1">
                        {l.rooms.slice(0, 4).map((r, idx) => (
                          <li key={idx} className="flex justify-between gap-2">
                            <span className="text-stone-700">
                              {ROOM_TYPE_LABELS[r.roomType] ?? r.roomType}{" "}
                              <span className="text-xs text-stone-400">
                                · sleeps {r.capacity}
                              </span>
                            </span>
                            <span className="shrink-0 text-xs font-medium text-emerald-700">
                              <Money npr={Number(r.basePriceNpr)} />
                            </span>
                          </li>
                        ))}
                        {l.rooms.length > 4 && (
                          <li className="text-xs text-stone-400">
                            + {l.rooms.length - 4} more
                          </li>
                        )}
                      </ul>
                    )
                  )}
                />
                {amenityUnion.length > 0 && (
                  <tr className="bg-stone-50/50 dark:bg-stone-900/40">
                    <td className="sticky left-0 border-r border-stone-200 bg-stone-50/50 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-stone-500 dark:border-stone-800 dark:bg-stone-900/40 dark:text-stone-400">
                      Amenities
                    </td>
                    {ordered.map((lodge) => {
                      const has = new Set(amenityKeys(lodge.amenities));
                      return (
                        <td key={lodge.id} className="px-4 py-2 align-top">
                          <ul className="space-y-1">
                            {amenityUnion.map((k) => {
                              const present = has.has(k);
                              return (
                                <li
                                  key={k}
                                  className={`flex items-center gap-1.5 text-xs ${
                                    present
                                      ? "text-stone-700 dark:text-stone-200"
                                      : "text-stone-300 dark:text-stone-600"
                                  }`}
                                >
                                  <span
                                    aria-hidden
                                    className={
                                      present
                                        ? "text-emerald-600 dark:text-emerald-400"
                                        : "text-stone-300 dark:text-stone-600"
                                    }
                                  >
                                    {present ? "✓" : "—"}
                                  </span>
                                  {AMENITY_LABELS[k] ?? k}
                                </li>
                              );
                            })}
                          </ul>
                        </td>
                      );
                    })}
                  </tr>
                )}
                <tr>
                  <td className="sticky left-0 border-r border-stone-200 bg-white px-4 py-3 dark:border-stone-800 dark:bg-stone-900" />
                  {ordered.map((lodge) => (
                    <td key={lodge.id} className="px-4 py-3 align-top">
                      <Link
                        href={`/lodge/${lodge.slug}/book`}
                        className="inline-block w-full rounded-lg bg-emerald-700 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800"
                      >
                        Book
                      </Link>
                      <Link
                        href={`/lodge/${lodge.slug}`}
                        className="mt-2 inline-block w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-center text-sm font-medium text-stone-700 transition hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800"
                      >
                        View details
                      </Link>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}

function Row({
  label,
  cells,
  highlight,
  highlightLabel,
}: {
  label: string;
  cells: React.ReactNode[];
  highlight?: number;
  highlightLabel?: string;
}) {
  return (
    <tr>
      <td className="sticky left-0 z-10 border-r border-stone-200 bg-white px-4 py-3 text-xs font-semibold uppercase tracking-wider text-stone-500 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-400">
        {label}
      </td>
      {cells.map((c, i) => (
        <td key={i} className="px-4 py-3 align-top text-stone-800 dark:text-stone-200">
          {c}
          {highlight === i && highlightLabel && (
            <span className="ml-2 inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
              {highlightLabel}
            </span>
          )}
        </td>
      ))}
    </tr>
  );
}
