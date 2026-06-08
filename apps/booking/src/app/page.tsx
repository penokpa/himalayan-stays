export const dynamic = "force-dynamic";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { TREK_ROUTES } from "@/lib/trek-routes";
import Money from "@/components/Money";
import { organizationJsonLd, websiteJsonLd, ldJson } from "@/lib/structured-data";

export default async function HomePage() {
  const [lodgesByRoute, topLodges, recentReviews] = await Promise.all([
    prisma.lodge.groupBy({
      by: ["trekRoute"],
      where: { isActive: true },
      _count: { id: true },
    }),
    prisma.lodge.findMany({
      where: { isActive: true },
      include: {
        rooms: { where: { isActive: true }, select: { basePriceNpr: true } },
        reviews: { select: { rating: true } },
      },
    }),
    prisma.review.findMany({
      orderBy: { createdAt: "desc" },
      take: 3,
      include: {
        user: { select: { name: true, nationality: true } },
        lodge: { select: { name: true, slug: true, village: true } },
      },
    }),
  ]);

  const lodgeCountByRoute = Object.fromEntries(
    lodgesByRoute.map((r) => [r.trekRoute, r._count.id])
  );

  // Top 3 lodges by avg rating (min 1 review), tiebreaker: review count
  const ranked = topLodges
    .map((l) => {
      const count = l.reviews.length;
      const avg = count === 0 ? 0 : l.reviews.reduce((s, r) => s + r.rating, 0) / count;
      const minPrice =
        l.rooms.length > 0 ? Math.min(...l.rooms.map((r) => Number(r.basePriceNpr))) : 0;
      return { lodge: l, avg, count, minPrice };
    })
    .filter((x) => x.count > 0)
    .sort((a, b) => b.avg - a.avg || b.count - a.count)
    .slice(0, 3);

  return (
    <main className="min-h-screen bg-stone-50 dark:bg-stone-950">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: ldJson(organizationJsonLd()) }}
      />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: ldJson(websiteJsonLd()) }}
      />
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-emerald-50 via-stone-50 to-stone-50 px-6 pt-20 pb-24 text-center sm:pt-28 sm:pb-32 dark:from-emerald-950/40 dark:via-stone-950 dark:to-stone-950">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 bg-[radial-gradient(circle_at_50%_0%,rgba(4,120,87,0.18),transparent_60%)]"
        />
        <h1 className="mx-auto max-w-4xl text-4xl font-bold tracking-tight text-stone-900 sm:text-5xl lg:text-6xl dark:text-stone-100">
          Book teahouse treks across
          <br />
          <span className="text-emerald-700 dark:text-emerald-400">Nepal&apos;s Himalayas</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-stone-600 dark:text-stone-300">
          Plan multi-lodge itineraries for Everest Base Camp and beyond.
          Reserve your beds along the trail in one flow — from Lukla to Gorak Shep,
          from your phone in Kathmandu.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/treks"
            className="rounded-lg bg-emerald-700 px-8 py-3 text-lg font-semibold text-white shadow-sm transition hover:bg-emerald-800"
          >
            Explore Treks
          </Link>
          <Link
            href="/treks/ebc/book"
            className="rounded-lg border border-stone-300 bg-white px-8 py-3 text-lg font-medium text-stone-800 transition hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:hover:bg-stone-800"
          >
            Build your own EBC trek →
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="text-center text-2xl font-bold text-stone-900 sm:text-3xl dark:text-stone-100">
          How it works
        </h2>
        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
          {[
            {
              step: "1",
              title: "Pick your trek",
              body:
                "Browse trek routes, see lodges along the trail with prices, photos, ratings, and altitudes.",
              icon: "🥾",
            },
            {
              step: "2",
              title: "Build your itinerary",
              body:
                "Use a recommended template or pick exactly which villages, lodges, and how many nights at each.",
              icon: "🗺️",
            },
            {
              step: "3",
              title: "Book and trek",
              body:
                "Pay securely with card, eSewa, Khalti, or pay at the lodge. Show your booking ref at each stop — works offline.",
              icon: "✓",
            },
          ].map((s) => (
            <div
              key={s.step}
              className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-stone-200 dark:bg-stone-900 dark:ring-stone-800"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-2xl dark:bg-emerald-950/50">
                {s.icon}
              </div>
              <p className="mt-4 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                Step {s.step}
              </p>
              <h3 className="mt-1 text-lg font-semibold text-stone-900 dark:text-stone-100">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-600 dark:text-stone-300">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Trek routes */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex items-baseline justify-between">
          <h2 className="text-2xl font-bold text-stone-900 sm:text-3xl dark:text-stone-100">Trek routes</h2>
          <Link
            href="/treks"
            className="text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400"
          >
            See all →
          </Link>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TREK_ROUTES.map((r) => {
            const count = lodgeCountByRoute[r.key] ?? 0;
            const isLive = count > 0;
            return (
              <Link
                key={r.key}
                href={isLive ? `/treks/${r.slug}` : "/treks"}
                className={`group block rounded-xl bg-white p-5 shadow-sm ring-1 ring-stone-200 transition dark:bg-stone-900 dark:ring-stone-800 ${
                  isLive ? "hover:ring-2 hover:ring-emerald-500" : "opacity-60"
                }`}
              >
                <div className="flex items-baseline justify-between">
                  <h3 className="font-semibold text-stone-900 group-hover:text-emerald-700 dark:text-stone-100 dark:group-hover:text-emerald-400">
                    {r.name}
                  </h3>
                  <span className="text-xs font-medium text-stone-500 dark:text-stone-400">
                    {isLive ? `${count} ${count === 1 ? "lodge" : "lodges"}` : "Coming soon"}
                  </span>
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-stone-500 dark:text-stone-400">{r.description}</p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Top-rated lodges */}
      {ranked.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-stone-900 sm:text-3xl dark:text-stone-100">Top-rated lodges</h2>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
            Highest reviewed by trekkers who&apos;ve stayed.
          </p>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ranked.map(({ lodge, avg, count, minPrice }) => {
              const photo = lodge.photos[0] ?? null;
              return (
                <Link
                  key={lodge.id}
                  href={`/lodge/${lodge.slug}`}
                  className="group overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-stone-200 transition hover:ring-2 hover:ring-emerald-500 dark:bg-stone-900 dark:ring-stone-800"
                >
                  {photo ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={photo} alt={lodge.name} className="h-44 w-full object-cover" />
                  ) : (
                    <div className="h-44 w-full bg-stone-200 dark:bg-stone-800" />
                  )}
                  <div className="p-4">
                    <div className="flex items-baseline justify-between gap-3">
                      <h3 className="truncate font-semibold text-stone-900 group-hover:text-emerald-700 dark:text-stone-100 dark:group-hover:text-emerald-400">
                        {lodge.name}
                      </h3>
                      <span className="shrink-0 text-amber-600 dark:text-amber-400">
                        ★ {avg.toFixed(1)}{" "}
                        <span className="text-stone-400 dark:text-stone-500">({count})</span>
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                      {lodge.village}
                      {lodge.altitudeMeters
                        ? ` · ${lodge.altitudeMeters.toLocaleString()}m`
                        : ""}
                    </p>
                    {minPrice > 0 && (
                      <p className="mt-3 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                        From <Money npr={minPrice} />
                      </p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Why us */}
      <section className="bg-emerald-700 py-16 text-white dark:bg-emerald-900">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold sm:text-3xl">Built for the trail, not the city</h2>
          <div className="mt-10 grid grid-cols-1 gap-8 md:grid-cols-3">
            <Feature
              icon="🏔️"
              title="Multi-lodge itineraries"
              body="Stitch your own route across villages — pick lodges and nights at each stop. Single booking, single payment."
            />
            <Feature
              icon="🇳🇵"
              title="Pay how Nepal pays"
              body="Card via Stripe, or eSewa & Khalti for trekkers already in-country. Or just pay at the lodge with cash."
            />
            <Feature
              icon="📵"
              title="Works above the wifi line"
              body="Download a PDF of your itinerary in Kathmandu. Show it at every lodge — no signal needed past Namche."
            />
          </div>
        </div>
      </section>

      {/* Reviews */}
      {recentReviews.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-stone-900 sm:text-3xl dark:text-stone-100">From recent trekkers</h2>
          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
            {recentReviews.map((r) => (
              <article
                key={r.id}
                className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-stone-200 dark:bg-stone-900 dark:ring-stone-800"
              >
                <div className="flex items-center gap-1 text-amber-500 dark:text-amber-400">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span key={i}>{i < r.rating ? "★" : "☆"}</span>
                  ))}
                </div>
                {r.comment && (
                  <p className="mt-3 text-sm text-stone-700 leading-relaxed line-clamp-5 dark:text-stone-200">
                    &ldquo;{r.comment}&rdquo;
                  </p>
                )}
                <p className="mt-4 text-xs text-stone-500 dark:text-stone-400">
                  <span className="font-medium text-stone-700 dark:text-stone-200">{r.user.name}</span>
                  {r.user.nationality && ` · ${r.user.nationality}`}
                  {" · stayed at "}
                  <Link
                    href={`/lodge/${r.lodge.slug}`}
                    className="font-medium text-emerald-700 hover:underline dark:text-emerald-400"
                  >
                    {r.lodge.name}
                  </Link>
                </p>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* CTA footer */}
      <section className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl dark:text-stone-100">
          Ready to plan your trek?
        </h2>
        <p className="mt-3 text-stone-600 dark:text-stone-300">
          Pick a route or build a custom itinerary in 5 minutes.
        </p>
        <Link
          href="/treks"
          className="mt-8 inline-block rounded-lg bg-emerald-700 px-10 py-3 text-lg font-semibold text-white shadow-sm transition hover:bg-emerald-800"
        >
          Start planning
        </Link>
      </section>
    </main>
  );
}

function Feature({
  icon,
  title,
  body,
}: {
  icon: string;
  title: string;
  body: string;
}) {
  return (
    <div>
      <div className="text-3xl">{icon}</div>
      <h3 className="mt-3 text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-emerald-50">{body}</p>
    </div>
  );
}
