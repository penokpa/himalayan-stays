import Skeleton from "@/components/Skeleton";

export default function LodgeLoading() {
  return (
    <main className="min-h-screen bg-stone-50 dark:bg-stone-950">
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <Skeleton className="h-4 w-28" />

        {/* Gallery */}
        <Skeleton rounded="xl" className="mt-6 h-72 w-full sm:h-80" />

        {/* Title row */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Skeleton className="h-8 w-64" />
          <Skeleton rounded="lg" className="h-7 w-24" />
          <Skeleton rounded="lg" className="h-7 w-24" />
        </div>
        <Skeleton className="mt-2 h-4 w-56" />

        {/* Description */}
        <div className="mt-4 space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-9/12" />
        </div>

        {/* Map placeholder */}
        <Skeleton rounded="xl" className="mt-10 h-64 w-full" />

        {/* Availability + calendar */}
        <Skeleton className="mt-10 h-5 w-44" />
        <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
          <Skeleton rounded="xl" className="h-32 w-full" />
          <Skeleton rounded="xl" className="h-72 w-full" />
        </div>

        {/* Rooms */}
        <Skeleton className="mt-10 h-5 w-40" />
        <div className="mt-3 space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} rounded="lg" className="h-20 w-full" />
          ))}
        </div>
      </div>
    </main>
  );
}
