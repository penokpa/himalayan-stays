export const dynamic = "force-dynamic";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import PaymentMethodSelector from "@/components/PaymentMethodSelector";
import Money from "@/components/Money";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ ref: string }>;
}) {
  const { ref } = await params;
  return { title: `Pay for Booking ${ref} | Himalayan Stays` };
}

export default async function PaymentPage({
  params,
  searchParams,
}: {
  params: Promise<{ ref: string }>;
  searchParams: Promise<{ payment?: string }>;
}) {
  const { ref } = await params;
  const { payment } = await searchParams;

  const booking = await prisma.booking.findUnique({
    where: { bookingRef: ref },
    include: {
      legs: {
        orderBy: { dayNumber: "asc" },
        include: {
          lodge: { select: { name: true, village: true } },
          room: { select: { name: true } },
        },
      },
    },
  });

  if (!booking) notFound();

  if (booking.paymentStatus === "COMPLETED") {
    redirect(`/booking/${ref}/confirmation`);
  }

  const totalNpr = Number(booking.totalPriceNpr ?? 0);
  const totalUsd = booking.totalPriceUsd ? Number(booking.totalPriceUsd) : null;

  return (
    <main className="min-h-screen bg-stone-50">
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
        <h1 className="text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
          Complete Your Booking
        </h1>
        <p className="mt-2 text-stone-600">
          Booking Reference:{" "}
          <span className="font-semibold text-emerald-700">{ref}</span>
        </p>

        {payment === "failed" && (
          <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
            Payment was not completed. Please try again or choose a different
            method.
          </div>
        )}

        {payment === "cancelled" && (
          <div className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200">
            Payment was cancelled. You can try again or choose to pay at the
            lodge.
          </div>
        )}

        {/* Booking Summary */}
        <div className="mt-6 rounded-xl bg-white p-5 shadow-sm ring-1 ring-stone-200">
          <h2 className="font-semibold text-stone-900">Booking Summary</h2>
          <div className="mt-3 space-y-2 text-sm">
            {booking.legs.map((leg, i) => (
              <div key={leg.id} className="flex items-start justify-between gap-3">
                <span className="min-w-0 flex-1 text-stone-600">
                  {booking.legs.length > 1 && `${i + 1}. `}
                  {leg.lodge.name} &middot; {leg.room.name} &middot;{" "}
                  {leg.nightCount} {leg.nightCount === 1 ? "night" : "nights"}
                </span>
                <Money
                  npr={Number(leg.legTotal)}
                  className="shrink-0 whitespace-nowrap font-medium text-stone-900"
                />
              </div>
            ))}
          </div>
          <div className="mt-3 flex justify-between border-t border-stone-200 pt-3 text-lg font-semibold">
            <span className="text-stone-900">Total</span>
            <Money npr={totalNpr} className="text-emerald-700" />
          </div>
          {totalUsd && (
            <p className="mt-1 text-right text-xs text-stone-400">
              ~USD {totalUsd.toLocaleString()} for card payments
            </p>
          )}
        </div>

        {/* Payment Method Selection */}
        <div className="mt-6">
          <h2 className="mb-4 font-semibold text-stone-900">
            Choose Payment Method
          </h2>
          <PaymentMethodSelector
            bookingRef={ref}
            totalNpr={totalNpr}
            totalUsd={totalUsd}
          />
        </div>
      </div>
    </main>
  );
}
