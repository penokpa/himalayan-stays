import Skeleton from "@/components/Skeleton";

export default function TreksLoading() {
  return (
    <main className="min-h-screen bg-stone-50 dark:bg-stone-950">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="mt-3 h-5 w-96 max-w-full" />

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-stone-200 dark:bg-stone-900 dark:ring-stone-800"
            >
              <Skeleton rounded="md" className="h-28 w-full" />
              <div className="space-y-2 p-4">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-11/12" />
                <Skeleton className="h-3 w-7/12" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
