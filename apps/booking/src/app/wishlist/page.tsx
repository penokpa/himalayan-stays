export const dynamic = "force-dynamic";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getWishlist } from "@/lib/wishlist-server";
import Money from "@/components/Money";
import WishlistButton from "@/components/WishlistButton";
import CompareButton from "@/components/CompareButton";

export const metadata = {
  title: "Saved Lodges | Himalayan Stays",
};

export default async function WishlistPage() {
  const slugs = await getWishlist();

  const lodges =
    slugs.length === 0
      ? []
      : await prisma.lodge.findMany({
          where: { slug: { in: slugs }, isActive: true },
          include: {
            rooms: { where: { isActive: true }, select: { basePriceNpr: true } },
            reviews: { select: { rating: true } },
          },
        });

  // Preserve cookie ordering
  const ordered = slugs
    .map((s) => lodges.find((l) => l.slug === s))
    .filter((x): x is (typeof lodges)[number] => !!x);

  return (
    <main className="min-h-screen bg-stone-50 dark:bg-stone-950">
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <Link
          href="/treks"
          className="text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400"
        >
          ← All trek routes
        </Link>

        <h1 className="mt-4 text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl dark:text-stone-100">
          Saved Lodges
        </h1>
        <p className="mt-2 text-stone-600 dark:text-stone-300">
          {ordered.length === 0
            ? "Tap the heart on any lodge to save it for later."
            : `${ordered.length} ${ordered.length === 1 ? "lodge" : "lodges"} saved.`}
        </p>

        {ordered.length === 0 ? (
          <div className="mt-12 rounded-xl border border-dashed border-stone-300 bg-white p-12 text-center dark:border-stone-700 dark:bg-stone-900">
            <p className="text-stone-600 dark:text-stone-300">No saved lodges yet.</p>
            <Link
              href="/treks"
              className="mt-4 inline-block rounded-lg bg-emerald-700 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              Browse trek routes
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ordered.map((lodge) => {
              const photo = lodge.photos[0] ?? null;
              const minPrice =
                lodge.rooms.length > 0
                  ? Math.min(...lodge.rooms.map((r) => Number(r.basePriceNpr)))
                  : null;
              const reviewCount = lodge.reviews.length;
              const avgRating =
                reviewCount === 0
                  ? null
                  : lodge.reviews.reduce((s, r) => s + r.rating, 0) / reviewCount;
              return (
                <div
                  key={lodge.id}
                  className="group relative overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-stone-200 transition hover:shadow-md hover:ring-emerald-300 dark:bg-stone-900 dark:ring-stone-800"
                >
                  <WishlistButton slug={lodge.slug} variant="overlay" />
                  <CompareButton slug={lodge.slug} variant="overlay" />
                  <Link href={`/lodge/${lodge.slug}`} className="block">
                    {photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={photo} alt={lodge.name} className="h-40 w-full object-cover" />
                    ) : (
                      <div className="h-40 w-full bg-stone-200 dark:bg-stone-800" />
                    )}
                    <div className="px-4 py-3">
                      <h3 className="font-semibold text-stone-900 group-hover:text-emerald-700 dark:text-stone-100 dark:group-hover:text-emerald-400">
                        {lodge.name}
                      </h3>
                      <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
                        {lodge.village}
                        {lodge.altitudeMeters ? ` · ${lodge.altitudeMeters.toLocaleString()}m` : ""}
                      </p>
                      <div className="mt-2 flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 text-stone-500 dark:text-stone-400">
                          {lodge.rooms.length} {lodge.rooms.length === 1 ? "room" : "rooms"}
                          {avgRating !== null && (
                            <span className="inline-flex items-center gap-0.5 text-amber-600 dark:text-amber-400">
                              <span>★</span>
                              <span className="font-semibold">{avgRating.toFixed(1)}</span>
                              <span className="text-stone-400 dark:text-stone-500">({reviewCount})</span>
                            </span>
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
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
