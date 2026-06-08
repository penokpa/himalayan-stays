export const dynamic = "force-dynamic";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Decimal } from "@prisma/client/runtime/library";
import { AddRoomForm } from "./add-room-form";
import { PhotosForm } from "./photos-form";
import { SeasonsForm } from "./seasons-form";

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

export default async function LodgeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const lodge = await prisma.lodge.findUnique({
    where: { id },
    include: {
      owner: { select: { name: true, email: true } },
      rooms: {
        orderBy: [{ floor: "asc" }, { name: "asc" }],
      },
    },
  });

  if (!lodge) {
    notFound();
  }

  const trekRouteLabels: Record<string, string> = {
    EBC: "Everest Base Camp",
    ABC: "Annapurna Base Camp",
    LANGTANG: "Langtang",
    MANASLU: "Manaslu",
    UPPER_MUSTANG: "Upper Mustang",
  };

  return (
    <>
      <h1 className="text-2xl font-bold text-gray-900">{lodge.name}</h1>

      {/* Lodge info */}
      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Lodge Information</h2>
        <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-sm font-medium text-gray-500">Village</dt>
            <dd className="mt-1 text-sm text-gray-900">{lodge.village}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">District</dt>
            <dd className="mt-1 text-sm text-gray-900">{lodge.district}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Trek Route</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {trekRouteLabels[lodge.trekRoute] ?? lodge.trekRoute}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Trail Position</dt>
            <dd className="mt-1 text-sm text-gray-900">{lodge.trailPosition}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Altitude</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {lodge.altitudeMeters ? `${lodge.altitudeMeters.toLocaleString()} m` : "--"}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Managed By</dt>
            <dd className="mt-1 text-sm text-gray-900 capitalize">{lodge.managedBy.toLowerCase()}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Owner</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {lodge.owner.name} ({lodge.owner.email})
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Status</dt>
            <dd className="mt-1">
              {lodge.isActive ? (
                <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                  Active
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                  Inactive
                </span>
              )}
            </dd>
          </div>
          {lodge.description && (
            <div className="sm:col-span-2 lg:col-span-3">
              <dt className="text-sm font-medium text-gray-500">Description</dt>
              <dd className="mt-1 text-sm text-gray-900">{lodge.description}</dd>
            </div>
          )}
        </dl>
      </div>

      {/* Photos */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900">
          Photos ({lodge.photos.length})
        </h2>
        <PhotosForm lodgeId={lodge.id} initialPhotos={lodge.photos} />
      </div>

      {/* Rooms table */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900">
          Rooms ({lodge.rooms.length})
        </h2>
        <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Type
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Capacity
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Base Price
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Floor
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium tracking-wider text-gray-500 uppercase">
                    Active
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {lodge.rooms.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">
                      No rooms added yet.
                    </td>
                  </tr>
                )}
                {lodge.rooms.map((room) => (
                  <tr key={room.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                      {room.name}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                      {roomTypeLabel(room.roomType)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-700">
                      {room.capacity}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-700">
                      {formatPrice(room.basePriceNpr)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-700">
                      {room.floor ?? "--"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-center">
                      {room.isActive ? (
                        <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
                      ) : (
                        <span className="inline-block h-2 w-2 rounded-full bg-gray-300" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add room form */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900">Add Room</h2>
        <AddRoomForm lodgeId={lodge.id} />
      </div>

      {/* Seasonal pricing */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900">Seasonal Pricing</h2>
        <SeasonsForm lodgeId={lodge.id} />
      </div>
    </>
  );
}
