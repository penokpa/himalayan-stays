import Skeleton from "@/components/Skeleton";

export default function OwnerLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-72" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} rounded="xl" className="h-24" />
        ))}
      </div>
      <Skeleton rounded="xl" className="mt-6 h-72" />
    </div>
  );
}
