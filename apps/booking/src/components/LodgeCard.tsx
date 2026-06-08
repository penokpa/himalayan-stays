"use client";

import Link from "next/link";
import WishlistButton from "@/components/WishlistButton";
import CompareButton from "@/components/CompareButton";
import { getAmenityChips } from "@/lib/amenities";
import { useCurrency } from "@/lib/use-currency";

export interface LodgeCardData {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  photo?: string | null;
  roomCount?: number;
  minPriceNpr?: number | null;
  avgRating?: number | null;
  reviewCount?: number;
  amenities?: Record<string, boolean> | null;
}

interface GridProps {
  lodge: LodgeCardData;
  variant: "grid";
}

interface RowProps {
  lodge: LodgeCardData;
  variant: "row";
  selected?: boolean;
  onSelect?: () => void;
}

type Props = GridProps | RowProps;

function PhotoFallback({ size }: { size: "sm" | "lg" }) {
  return (
    <div
      className={`flex w-full items-center justify-center bg-stone-200 text-stone-400 dark:bg-stone-800 dark:text-stone-500 ${
        size === "lg" ? "h-40" : "h-full"
      }`}
    >
      <svg
        className={size === "lg" ? "h-10 w-10" : "h-6 w-6"}
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
  );
}

function StarRating({ rating, count }: { rating: number; count: number }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-amber-600 dark:text-amber-400">
      <svg className="h-3.5 w-3.5 fill-amber-400" viewBox="0 0 20 20">
        <path d="M9.05 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.539 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.539-1.118l1.519-4.674a1 1 0 00-.363-1.118L2.075 10.1c-.783-.57-.38-1.81.588-1.81h4.915a1 1 0 00.95-.69l1.519-4.674z" />
      </svg>
      <span className="font-semibold">{rating.toFixed(1)}</span>
      <span className="text-stone-400 dark:text-stone-500">({count})</span>
    </span>
  );
}

export default function LodgeCard(props: Props) {
  const { lodge, variant } = props;
  const {
    name,
    slug,
    description,
    photo,
    roomCount,
    minPriceNpr,
    avgRating,
    reviewCount,
  } = lodge;
  const { format } = useCurrency();

  if (variant === "grid") {
    return (
      <div className="group relative overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-stone-200 transition hover:shadow-md hover:ring-emerald-300 dark:bg-stone-900 dark:ring-stone-800">
        <WishlistButton slug={slug} variant="overlay" />
        <CompareButton slug={slug} variant="overlay" />
        <Link href={`/lodge/${slug}`} className="block">
          {photo ? (
            <img src={photo} alt={name} className="h-40 w-full object-cover" loading="lazy" />
          ) : (
            <PhotoFallback size="lg" />
          )}
          <div className="px-4 py-3">
            <h3 className="font-semibold text-stone-900 group-hover:text-emerald-700 dark:text-stone-100 dark:group-hover:text-emerald-400">
              {name}
            </h3>
            {description && (
              <p className="mt-1 line-clamp-2 text-xs text-stone-500 dark:text-stone-400">
                {description}
              </p>
            )}
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-stone-500 dark:text-stone-400">
                {typeof roomCount === "number" && (
                  <span>
                    {roomCount} {roomCount === 1 ? "room" : "rooms"}
                  </span>
                )}
                {avgRating !== null && avgRating !== undefined && reviewCount ? (
                  <StarRating rating={avgRating} count={reviewCount} />
                ) : null}
              </span>
              {minPriceNpr !== null && minPriceNpr !== undefined && (
                <span className="font-medium text-emerald-700 dark:text-emerald-400">
                  From {format(minPriceNpr)}
                </span>
              )}
            </div>
          </div>
        </Link>
      </div>
    );
  }

  // row variant
  const { selected, onSelect } = props;
  const amenityChips = getAmenityChips(lodge.amenities, 4);

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`flex w-full items-stretch gap-3 rounded-lg border p-2 text-left transition ${
        selected
          ? "border-emerald-600 bg-emerald-50 ring-1 ring-emerald-600 dark:bg-emerald-950/30"
          : "border-stone-200 bg-white hover:border-emerald-300 dark:border-stone-800 dark:bg-stone-900"
      }`}
    >
      <div className="h-16 w-20 shrink-0 overflow-hidden rounded-md bg-stone-200 dark:bg-stone-800">
        {photo ? (
          <img src={photo} alt={name} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <PhotoFallback size="sm" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate font-semibold text-stone-900 dark:text-stone-100">
                {name}
              </span>
              {selected && (
                <svg
                  className="h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.704 5.29a1 1 0 010 1.42l-7.5 7.5a1 1 0 01-1.414 0l-3.5-3.5a1 1 0 011.414-1.42L8.5 12.085l6.79-6.795a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </div>
            {description && (
              <p className="line-clamp-1 text-xs text-stone-500 dark:text-stone-400">
                {description}
              </p>
            )}
          </div>
          {minPriceNpr !== null && minPriceNpr !== undefined && (
            <span className="shrink-0 whitespace-nowrap text-sm font-semibold text-emerald-700 dark:text-emerald-400">
              From {format(minPriceNpr)}
            </span>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-stone-500 dark:text-stone-400">
          {typeof roomCount === "number" && (
            <span>
              {roomCount} {roomCount === 1 ? "room" : "rooms"}
            </span>
          )}
          {avgRating !== null && avgRating !== undefined && reviewCount ? (
            <StarRating rating={avgRating} count={reviewCount} />
          ) : null}
          {amenityChips.map((a) => (
            <span
              key={a.key}
              className="inline-flex items-center gap-0.5 rounded-full bg-stone-100 px-1.5 py-0.5 dark:bg-stone-800"
              title={a.label}
            >
              <span aria-hidden>{a.icon}</span>
              <span className="sr-only">{a.label}</span>
            </span>
          ))}
        </div>
      </div>
    </button>
  );
}
