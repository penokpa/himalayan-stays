export const dynamic = "force-dynamic";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

const ROOM_TYPE_LABELS: Record<string, string> = {
  PRIVATE_SINGLE: "Private Single",
  PRIVATE_DOUBLE: "Private Double",
  PRIVATE_TWIN: "Private Twin",
  DORM: "Dormitory",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const lodge = await prisma.lodge.findUnique({
    where: { slug },
    select: { name: true, village: true },
  });
  if (!lodge) return { title: "Not Found" };
  return {
    title: `${lodge.name}, ${lodge.village} | Himalayan Stays`,
  };
}

export default async function LodgeDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const lodge = await prisma.lodge.findUnique({
    where: { slug },
    include: {
      rooms: {
        where: { isActive: true },
        orderBy: { basePriceNpr: "asc" },
      },
    },
  });

  if (!lodge || !lodge.isActive) notFound();

  const amenities: string[] = Array.isArray(lodge.amenities)
    ? (lodge.amenities as string[])
    : [];
  const photo = lodge.photos[0] ?? null;

  return (
    <main className="min-h-screen bg-stone-50">
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <Link
          href="/treks"
          className="text-sm font-medium text-emerald-700 hover:underline"
        >
          &larr; Back to treks
        </Link>

        {/* Header */}
        <div className="mt-6">
          {photo ? (
            <img
              src={photo}
              alt={lodge.name}
              className="h-64 w-full rounded-xl object-cover sm:h-80"
            />
          ) : (
            <div className="flex h-64 w-full items-center justify-center rounded-xl bg-stone-200 text-stone-400 sm:h-80">
              <svg
                className="h-16 w-16"
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

          <h1 className="mt-6 text-3xl font-bold tracking-tight text-stone-900">
            {lodge.name}
          </h1>
          <p className="mt-2 text-stone-500">
            {lodge.village}, {lodge.district}
            {lodge.altitudeMeters &&
              ` · ${lodge.altitudeMeters.toLocaleString()}m elevation`}
          </p>

          {lodge.description && (
            <p className="mt-4 leading-relaxed text-stone-700">
              {lodge.description}
            </p>
          )}
        </div>

        {/* Amenities */}
        {amenities.length > 0 && (
          <section className="mt-10">
            <h2 className="text-lg font-semibold text-stone-900">Amenities</h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {amenities.map((amenity) => (
                <li
                  key={amenity}
                  className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700"
                >
                  {amenity}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Rooms */}
        <section className="mt-10">
          <h2 className="text-lg font-semibold text-stone-900">
            Available Rooms
          </h2>
          {lodge.rooms.length === 0 ? (
            <p className="mt-3 text-stone-500">
              No rooms are currently listed.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {lodge.rooms.map((room) => (
                <div
                  key={room.id}
                  className="flex items-center justify-between rounded-lg bg-white p-4 shadow-sm ring-1 ring-stone-200"
                >
                  <div>
                    <p className="font-medium text-stone-900">{room.name}</p>
                    <p className="mt-0.5 text-sm text-stone-500">
                      {ROOM_TYPE_LABELS[room.roomType] ?? room.roomType}
                      {" · "}
                      Sleeps {room.capacity}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-emerald-700">
                      NPR {Number(room.basePriceNpr).toLocaleString()}
                    </p>
                    <p className="text-xs text-stone-400">per night</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Book CTA */}
        {lodge.rooms.length > 0 && (
          <section className="mt-12">
            <Link
              href={`/lodge/${lodge.slug}/book`}
              className="inline-block rounded-lg bg-emerald-700 px-8 py-3 text-lg font-semibold text-white shadow-sm transition hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
            >
              Book a Room
            </Link>
          </section>
        )}
      </div>
    </main>
  );
}
