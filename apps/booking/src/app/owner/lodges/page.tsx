export const dynamic = "force-dynamic";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function OwnerLodgesPage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return <p className="text-gray-500">Not authenticated.</p>;

  const lodges = await prisma.lodge.findMany({
    where: { ownerId: userId },
    orderBy: { trailPosition: "asc" },
    include: {
      rooms: { where: { isActive: true }, select: { id: true, basePriceNpr: true } },
      reviews: { select: { rating: true } },
    },
  });

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-stone-100">My Lodges</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-stone-400">
            {lodges.length} {lodges.length === 1 ? "lodge" : "lodges"} you own — click to manage photos, seasons, and rooms.
          </p>
        </div>
        <Link
          href="/owner/lodges/new"
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add lodge
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {lodges.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-gray-500 sm:col-span-2 lg:col-span-3 dark:border-stone-700 dark:text-stone-400">
            You don&apos;t own any lodges yet. Click <strong>Add lodge</strong> above to create your first listing.
          </div>
        ) : (
          lodges.map((l) => {
            const photo = l.photos[0] ?? null;
            const minPrice =
              l.rooms.length > 0
                ? Math.min(...l.rooms.map((r) => Number(r.basePriceNpr)))
                : null;
            const avg =
              l.reviews.length === 0
                ? null
                : l.reviews.reduce((s, r) => s + r.rating, 0) / l.reviews.length;
            return (
              <Link
                key={l.id}
                href={`/owner/lodges/${l.id}`}
                className="group overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200 transition hover:ring-2 hover:ring-emerald-500"
              >
                {photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photo} alt={l.name} className="h-36 w-full object-cover" />
                ) : (
                  <div className="h-36 w-full bg-gray-200" />
                )}
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 group-hover:text-emerald-700">
                    {l.name}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {l.village}
                    {l.altitudeMeters ? ` · ${l.altitudeMeters.toLocaleString()}m` : ""}
                  </p>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-gray-500">
                      {l.rooms.length} {l.rooms.length === 1 ? "room" : "rooms"}
                      {avg !== null && (
                        <span className="ml-2 text-amber-600">
                          ★ {avg.toFixed(1)} ({l.reviews.length})
                        </span>
                      )}
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
          })
        )}
      </div>
    </>
  );
}
