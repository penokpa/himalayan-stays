"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useItineraryBuilder } from "../context";
import { ROOM_TYPE_LABELS } from "@/lib/booking-utils";

interface Room {
  id: string;
  name: string;
  roomType: string;
  capacity: number;
  basePriceNpr: number;
}

interface Lodge {
  id: string;
  name: string;
  slug: string;
  village: string;
  description: string | null;
  amenities: Record<string, boolean> | null;
  altitudeMeters: number | null;
  trailPosition: number;
  rooms?: Room[];
}

const AMENITY_LABELS: Record<string, string> = {
  wifi: "WiFi",
  hotShower: "Hot Shower",
  charging: "Charging",
  restaurant: "Restaurant",
  bar: "Bar",
  bakery: "Bakery",
  heater: "Heater",
  oxygenAvailable: "Oxygen",
  garden: "Garden",
  library: "Library",
};

export default function LodgeRoomSelectionPage() {
  const { route } = useParams<{ route: string }>();
  const router = useRouter();
  const ctx = useItineraryBuilder();

  const [lodges, setLodges] = useState<Lodge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedStop, setExpandedStop] = useState<number | null>(null);

  useEffect(() => {
    if (ctx.stops.length === 0) {
      router.replace(`/treks/${route}/book`);
      return;
    }

    fetch(`/api/lodges?trekRoute=${ctx.trekRoute}&includeRooms=true`)
      .then((r) => r.json())
      .then((data) => setLodges(data))
      .catch(() => setError("Failed to load lodges"))
      .finally(() => setLoading(false));
  }, [ctx.trekRoute, ctx.stops.length, route, router]);

  function getLodgesInVillage(village: string): Lodge[] {
    return lodges.filter(
      (l) => l.village.toLowerCase() === village.toLowerCase()
    );
  }

  function getRoomsForLodge(lodgeId: string): Room[] {
    const lodge = lodges.find((l) => l.id === lodgeId);
    return lodge?.rooms ?? [];
  }

  function getLodge(lodgeId: string): Lodge | undefined {
    return lodges.find((l) => l.id === lodgeId);
  }

  function getMinPrice(lodge: Lodge): number | null {
    if (!lodge.rooms?.length) return null;
    return Math.min(...lodge.rooms.map((r) => Number(r.basePriceNpr)));
  }

  function getAmenityList(lodge: Lodge): string[] {
    if (!lodge.amenities) return [];
    return Object.entries(lodge.amenities)
      .filter(([, v]) => v)
      .map(([k]) => AMENITY_LABELS[k] ?? k);
  }

  function handleLodgeSelect(stopIndex: number, newLodgeId: string) {
    const lodge = lodges.find((l) => l.id === newLodgeId);
    if (!lodge) return;
    ctx.updateStop(stopIndex, {
      lodgeId: lodge.id,
      lodgeName: lodge.name,
      lodgeVillage: lodge.village,
      lodgeAltitude: lodge.altitudeMeters,
      roomId: "",
      roomName: "",
      roomType: "",
      pricePerNight: 0,
    });
  }

  function handleRoomSelect(stopIndex: number, room: Room) {
    ctx.updateStop(stopIndex, {
      roomId: room.id,
      roomName: room.name,
      roomType: room.roomType,
      pricePerNight: Number(room.basePriceNpr),
    });
  }

  function handleContinue() {
    const missingStops = ctx.stops
      .filter((s) => !s.roomId)
      .map((s) => `${s.lodgeName} (Day ${s.dayNumber})`);
    if (missingStops.length > 0) {
      setError(`Please select a room at: ${missingStops.join(", ")}`);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    router.push(`/treks/${route}/book/details`);
  }

  if (loading) {
    return (
      <div className="py-12 text-center text-stone-400">Loading lodges...</div>
    );
  }

  if (error && lodges.length === 0) {
    return <div className="py-12 text-center text-red-600">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-stone-500">
        Pick a lodge and room at each stop. Compare lodges in the same village
        before choosing.
      </p>

      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
          {error}
        </div>
      )}

      <div className="space-y-6">
        {ctx.stops.map((stop, i) => {
          const villageLodges = getLodgesInVillage(stop.lodgeVillage);
          const currentLodge = getLodge(stop.lodgeId);
          const rooms = getRoomsForLodge(stop.lodgeId);
          const isExpanded = expandedStop === i;

          return (
            <div
              key={i}
              className="rounded-xl bg-white shadow-sm ring-1 ring-stone-200"
            >
              {/* Stop header */}
              <div className="border-b border-stone-100 px-5 py-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-xs font-bold text-white">
                      {i + 1}
                    </span>
                    <div>
                      <h3 className="font-semibold text-stone-900">
                        {stop.lodgeVillage}
                      </h3>
                      <p className="text-xs text-stone-500">
                        {stop.lodgeAltitude &&
                          `${stop.lodgeAltitude.toLocaleString()}m · `}
                        Day {stop.dayNumber} · {stop.nights}{" "}
                        {stop.nights === 1 ? "night" : "nights"}
                        {villageLodges.length > 1 && (
                          <span className="text-emerald-600">
                            {" "}
                            · {villageLodges.length} lodges to choose from
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  {stop.roomId && (
                    <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                      NPR{" "}
                      {(stop.pricePerNight * stop.nights).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>

              <div className="p-5">
                {/* Lodge options — show as cards when multiple */}
                {villageLodges.length > 1 ? (
                  <div className="space-y-3">
                    <p className="text-xs font-medium uppercase tracking-wider text-stone-400">
                      Choose a lodge
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {villageLodges.map((lodge) => {
                        const isSelected = stop.lodgeId === lodge.id;
                        const minPrice = getMinPrice(lodge);
                        const amenities = getAmenityList(lodge);

                        return (
                          <button
                            key={lodge.id}
                            type="button"
                            onClick={() => handleLodgeSelect(i, lodge.id)}
                            className={`rounded-lg border p-4 text-left transition ${
                              isSelected
                                ? "border-emerald-600 bg-emerald-50 ring-1 ring-emerald-600"
                                : "border-stone-200 bg-white hover:border-emerald-300 hover:shadow-sm"
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <h4 className="font-semibold text-stone-900">
                                {lodge.name}
                              </h4>
                              {isSelected && (
                                <svg
                                  className="h-5 w-5 shrink-0 text-emerald-600"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2.5}
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                              )}
                            </div>
                            {lodge.description && (
                              <p className="mt-1 line-clamp-2 text-xs text-stone-500">
                                {lodge.description}
                              </p>
                            )}
                            {amenities.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {amenities.slice(0, 5).map((a) => (
                                  <span
                                    key={a}
                                    className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-medium text-stone-600"
                                  >
                                    {a}
                                  </span>
                                ))}
                              </div>
                            )}
                            <div className="mt-2 flex items-center justify-between text-xs">
                              <span className="text-stone-500">
                                {lodge.rooms?.length ?? 0} rooms
                              </span>
                              {minPrice !== null && (
                                <span className="font-semibold text-emerald-700">
                                  From NPR {minPrice.toLocaleString()}/night
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  /* Single lodge — show info inline */
                  currentLodge && (
                    <div className="mb-3">
                      <h4 className="font-semibold text-stone-900">
                        {currentLodge.name}
                      </h4>
                      {currentLodge.description && (
                        <p className="mt-1 text-sm text-stone-500">
                          {currentLodge.description}
                        </p>
                      )}
                      {getAmenityList(currentLodge).length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {getAmenityList(currentLodge).map((a) => (
                            <span
                              key={a}
                              className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-medium text-stone-600"
                            >
                              {a}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                )}

                {/* Room selector — collapsible */}
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedStop(isExpanded ? null : i)
                    }
                    className="flex w-full items-center justify-between text-sm font-medium text-stone-700"
                  >
                    <span>
                      {stop.roomId
                        ? `Selected: ${stop.roomName} (${ROOM_TYPE_LABELS[stop.roomType] ?? stop.roomType}) — NPR ${stop.pricePerNight.toLocaleString()}/night`
                        : "Select a room"}
                    </span>
                    <svg
                      className={`h-4 w-4 transition ${isExpanded ? "rotate-180" : ""}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>

                  {(isExpanded || !stop.roomId) && (
                    <div className="mt-3">
                      {rooms.length === 0 ? (
                        <p className="text-sm text-stone-400 italic">
                          No rooms available at this lodge.
                        </p>
                      ) : (
                        <div className="grid gap-2 sm:grid-cols-2">
                          {rooms.map((room) => (
                            <button
                              key={room.id}
                              type="button"
                              onClick={() => {
                                handleRoomSelect(i, room);
                                setExpandedStop(null);
                              }}
                              className={`rounded-lg border p-3 text-left text-sm transition ${
                                stop.roomId === room.id
                                  ? "border-emerald-600 bg-emerald-50 ring-1 ring-emerald-600"
                                  : "border-stone-200 bg-white hover:border-emerald-300"
                              }`}
                            >
                              <div className="font-medium text-stone-900">
                                {room.name}
                              </div>
                              <div className="mt-0.5 text-xs text-stone-500">
                                {ROOM_TYPE_LABELS[room.roomType] ??
                                  room.roomType}{" "}
                                &middot; Sleeps {room.capacity}
                              </div>
                              <div className="mt-1 font-semibold text-emerald-700">
                                NPR{" "}
                                {Number(room.basePriceNpr).toLocaleString()}
                                /night
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Running total */}
      {ctx.grandTotal > 0 && (
        <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-stone-200">
          <div className="flex justify-between text-lg font-semibold">
            <span className="text-stone-900">Estimated Total</span>
            <span className="text-emerald-700">
              NPR {ctx.grandTotal.toLocaleString()}
            </span>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => router.push(`/treks/${route}/book`)}
          className="rounded-lg border border-stone-300 bg-white px-6 py-3 text-sm font-medium text-stone-700 transition hover:bg-stone-50"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleContinue}
          className="flex-1 rounded-lg bg-emerald-700 px-6 py-3 text-lg font-semibold text-white shadow-sm transition hover:bg-emerald-800"
        >
          Continue to Traveler Details
        </button>
      </div>
    </div>
  );
}
