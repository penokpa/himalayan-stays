export const dynamic = "force-dynamic";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { TREK_ROUTES } from "@/lib/trek-routes";

export const metadata = {
  title: "Explore Trek Routes | Himalayan Stays",
};

export default async function TreksPage() {
  const lodgeCounts = await prisma.lodge.groupBy({
    by: ["trekRoute"],
    where: { isActive: true },
    _count: { id: true },
  });

  const countMap = Object.fromEntries(
    lodgeCounts.map((c) => [c.trekRoute, c._count.id])
  );

  return (
    <main className="min-h-screen bg-stone-50">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
          Explore Trek Routes
        </h1>
        <p className="mt-3 text-lg text-stone-600">
          Choose a trek route to browse available lodges along the trail.
        </p>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {TREK_ROUTES.map((route) => {
            const count = countMap[route.key] ?? 0;
            return (
              <Link
                key={route.key}
                href={`/treks/${route.slug}`}
                className="group overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-stone-200 transition hover:shadow-md hover:ring-emerald-300"
              >
                <div
                  className={`bg-gradient-to-br ${route.gradient} px-6 py-8 text-white`}
                >
                  <h2 className="text-xl font-semibold">{route.name}</h2>
                  <p className="mt-1 text-sm text-white/80">
                    {count} {count === 1 ? "lodge" : "lodges"} available
                  </p>
                </div>
                <div className="px-6 py-4">
                  <p className="text-sm leading-relaxed text-stone-600">
                    {route.description}
                  </p>
                  <span className="mt-3 inline-block text-sm font-medium text-emerald-700 group-hover:underline">
                    View lodges &rarr;
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}
