"use client";

import dynamic from "next/dynamic";

const LodgeMap = dynamic(() => import("./LodgeMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-80 w-full items-center justify-center rounded-xl bg-stone-100 text-stone-400">
      Loading map…
    </div>
  ),
});

interface Props {
  lat: number;
  lng: number;
  name: string;
  village: string;
  altitudeMeters?: number | null;
}

export default function LodgeMapClient(props: Props) {
  return <LodgeMap {...props} />;
}
