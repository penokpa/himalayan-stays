export const dynamic = "force-dynamic";
import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Decimal } from "@prisma/client/runtime/library";
import { AddRoomForm } from "@/app/admin/lodges/[id]/add-room-form";
import { PhotosForm } from "@/app/admin/lodges/[id]/photos-form";
import { SeasonsForm } from "@/app/admin/lodges/[id]/seasons-form";
import LodgeDetailsForm from "@/components/LodgeDetailsForm";
import RoomEditDialog from "@/components/RoomEditDialog";
import OwnerOnboarding from "@/components/OwnerOnboarding";
import { getLodgeProgress } from "@/lib/owner-onboarding";

function roomTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    PRIVATE_SINGLE: "Private Single",
    PRIVATE_DOUBLE: "Private Double",
    PRIVATE_TWIN: "Private Twin",
    DORM: "Dormitory",
  };
  return labels[type] ?? type;
}

function formatPrice(value: Decimal): string {
  return `NPR ${Number(value).toLocaleString()}`;
}

export default async function OwnerLodgeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) notFound();

  const lodge = await prisma.lodge.findUnique({
    where: { id },
    include: {
      rooms: { orderBy: [{ floor: "asc" }, { name: "asc" }] },
    },
  });

  if (!lodge || (lodge.ownerId !== userId && session?.user?.role !== "ADMIN")) {
    notFound();
  }

  const progress = await getLodgeProgress(lodge.id);

  return (
    <>
      <Link
        href="/owner/lodges"
        className="text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400"
      >
        ← My Lodges
      </Link>

      <h1 className="mt-2 text-2xl font-bold text-gray-900 dark:text-stone-100">{lodge.name}</h1>
      <p className="text-sm text-gray-500 dark:text-stone-400">
        {lodge.village}, {lodge.district}
        {lodge.altitudeMeters ? ` · ${lodge.altitudeMeters.toLocaleString()}m` : ""}
        {!lodge.isActive && (
          <span className="ml-2 rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600 dark:bg-stone-800 dark:text-stone-300">
            Hidden from trekkers
          </span>
        )}
      </p>

      {/* Onboarding progress (hidden when complete) */}
      {progress && !progress.isComplete && (
        <div className="mt-6">
          <OwnerOnboarding progress={progress} hasAnyLodge={true} />
        </div>
      )}

      {/* Lodge details */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-stone-100">Lodge details</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-stone-400">
          What trekkers see on your public lodge page.
        </p>
        <div className="mt-3">
          <LodgeDetailsForm
            initial={{
              id: lodge.id,
              name: lodge.name,
              description: lodge.description ?? "",
              village: lodge.village,
              district: lodge.district,
              altitudeMeters: lodge.altitudeMeters,
              latitude: lodge.latitude,
              longitude: lodge.longitude,
              amenities: (lodge.amenities ?? {}) as Record<string, boolean>,
              isActive: lodge.isActive,
            }}
          />
        </div>
      </div>

      {/* Photos */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-stone-100">
          Photos ({lodge.photos.length})
        </h2>
        <PhotosForm lodgeId={lodge.id} initialPhotos={lodge.photos} />
      </div>

      {/* Rooms */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-stone-100">
          Rooms ({lodge.rooms.length})
        </h2>
        <div className="mt-3 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-stone-800">
              <thead className="bg-gray-50 dark:bg-stone-900/60">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-stone-400">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-stone-400">Type</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500 dark:text-stone-400">Capacity</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500 dark:text-stone-400">Base Price</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500 dark:text-stone-400">Floor</th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase text-gray-500 dark:text-stone-400">Active</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500 dark:text-stone-400">Edit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-stone-800">
                {lodge.rooms.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400 dark:text-stone-500">
                      No rooms added yet.
                    </td>
                  </tr>
                )}
                {lodge.rooms.map((room) => (
                  <tr key={room.id} className="hover:bg-gray-50 dark:hover:bg-stone-800/50">
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900 dark:text-stone-100">{room.name}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700 dark:text-stone-300">{roomTypeLabel(room.roomType)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-700 dark:text-stone-300">{room.capacity}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-700 dark:text-stone-300">{formatPrice(room.basePriceNpr)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-700 dark:text-stone-300">{room.floor ?? "--"}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-center">
                      {room.isActive ? (
                        <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
                      ) : (
                        <span className="inline-block h-2 w-2 rounded-full bg-gray-300" />
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <RoomEditDialog
                        room={{
                          id: room.id,
                          name: room.name,
                          roomType: room.roomType,
                          capacity: room.capacity,
                          basePriceNpr: Number(room.basePriceNpr),
                          floor: room.floor,
                          isActive: room.isActive,
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Room */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-stone-100">Add Room</h2>
        <AddRoomForm lodgeId={lodge.id} />
      </div>

      {/* Seasonal pricing */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-stone-100">Seasonal Pricing</h2>
        <SeasonsForm lodgeId={lodge.id} />
      </div>
    </>
  );
}
