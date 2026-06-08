import Skeleton from "@/components/Skeleton";

export default function TrekRouteLoading() {
  return (
    <main className="min-h-screen bg-stone-50 dark:bg-stone-950">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <Skeleton className="h-4 w-32" />

        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Skeleton className="h-9 w-72" />
            <Skeleton className="mt-2 h-4 w-56" />
          </div>
          <Skeleton rounded="lg" className="h-11 w-40" />
        </div>

        {/* Filters bar */}
        <Skeleton rounded="xl" className="mt-6 h-16 w-full" />

        {/* Map */}
        <Skeleton rounded="xl" className="mt-10 h-72 w-full" />

        {/* Elevation */}
        <Skeleton rounded="xl" className="mt-6 h-64 w-full" />

        {/* Lodge cards by village */}
        <div className="mt-10 space-y-10">
          {[1, 2].map((vi) => (
            <section key={vi}>
              <div className="flex items-center gap-3">
                <Skeleton rounded="full" className="h-10 w-10" />
                <div className="flex-1">
                  <Skeleton className="h-6 w-40" />
                  <Skeleton className="mt-1 h-3 w-48" />
                </div>
              </div>
              <div className="mt-4 ml-5 border-l-2 border-emerald-200/50 pl-8 dark:border-emerald-900/40">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-stone-200 dark:bg-stone-900 dark:ring-stone-800"
                    >
                      <Skeleton rounded="md" className="h-40 w-full" />
                      <div className="space-y-2 p-4">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-5/6" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
