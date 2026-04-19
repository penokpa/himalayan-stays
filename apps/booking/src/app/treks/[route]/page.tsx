export const dynamic = "force-dynamic";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SLUG_TO_ROUTE } from "@/lib/trek-routes";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ route: string }>;
}) {
  const { route } = await params;
  const info = SLUG_TO_ROUTE[route];
  if (!info) return { title: "Not Found" };
  return { title: `${info.name} Lodges | Himalayan Stays` };
}

export default async function RouteLodgesPage({
  params,
}: {
  params: Promise<{ route: string }>;
}) {
  const { route } = await params;
  const info = SLUG_TO_ROUTE[route];
  if (!info) notFound();

  const lodges = await prisma.lodge.findMany({
    where: { trekRoute: info.key, isActive: true },
    orderBy: { trailPosition: "asc" },
    include: {
      rooms: {
        where: { isActive: true },
        select: { id: true, basePriceNpr: true },
      },
    },
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

  return (
    <main className="min-h-screen bg-stone-50">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <Link
          href="/treks"
          className="text-sm font-medium text-emerald-700 hover:underline"
        >
          &larr; All Trek Routes
        </Link>

        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
              {info.name}
            </h1>
            <p className="mt-2 text-stone-600">
              {lodges.length} {lodges.length === 1 ? "lodge" : "lodges"} across{" "}
              {villages.length} stops along the trail.
            </p>
          </div>
          <Link
            href={`/treks/${route}/book`}
            className="inline-flex items-center justify-center rounded-lg bg-emerald-700 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 sm:shrink-0"
          >
            Book This Trek
          </Link>
        </div>

        {lodges.length === 0 ? (
          <div className="mt-12 rounded-lg border border-dashed border-stone-300 p-12 text-center text-stone-500">
            No lodges listed for this route yet. Check back soon!
          </div>
        ) : (
          <div className="mt-10 space-y-10">
            {villages.map((village, vi) => (
              <section key={village.name}>
                {/* Village header with trail connector */}
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-sm font-bold text-white">
                    {vi + 1}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-stone-900">
                      {village.name}
                    </h2>
                    <p className="text-sm text-stone-500">
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
                <div className="mt-4 ml-5 border-l-2 border-emerald-200 pl-8">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {village.lodges.map((lodge) => {
                      const roomCount = lodge.rooms.length;
                      const minPrice =
                        roomCount > 0
                          ? Math.min(
                              ...lodge.rooms.map((r) => Number(r.basePriceNpr))
                            )
                          : null;
                      const photo = lodge.photos[0] ?? null;

                      return (
                        <Link
                          key={lodge.id}
                          href={`/lodge/${lodge.slug}`}
                          className="group overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-stone-200 transition hover:shadow-md hover:ring-emerald-300"
                        >
                          {photo ? (
                            <img
                              src={photo}
                              alt={lodge.name}
                              className="h-40 w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-40 w-full items-center justify-center bg-stone-200 text-stone-400">
                              <svg
                                className="h-10 w-10"
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

                          <div className="px-4 py-3">
                            <h3 className="font-semibold text-stone-900 group-hover:text-emerald-700">
                              {lodge.name}
                            </h3>
                            {lodge.description && (
                              <p className="mt-1 line-clamp-2 text-xs text-stone-500">
                                {lodge.description}
                              </p>
                            )}
                            <div className="mt-2 flex items-center justify-between text-sm">
                              <span className="text-stone-500">
                                {roomCount}{" "}
                                {roomCount === 1 ? "room" : "rooms"}
                              </span>
                              {minPrice !== null && (
                                <span className="font-medium text-emerald-700">
                                  From NPR {minPrice.toLocaleString()}
                                </span>
                              )}
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>

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
