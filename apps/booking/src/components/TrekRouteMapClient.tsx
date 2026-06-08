"use client";

import dynamic from "next/dynamic";
import type { MapLodge } from "./TrekRouteMap";

const TrekRouteMap = dynamic(() => import("./TrekRouteMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[400px] w-full items-center justify-center rounded-xl bg-stone-100 text-stone-400">
      Loading trail map…
    </div>
  ),
});

export default function TrekRouteMapClient({ lodges }: { lodges: MapLodge[] }) {
  return <TrekRouteMap lodges={lodges} />;
}
