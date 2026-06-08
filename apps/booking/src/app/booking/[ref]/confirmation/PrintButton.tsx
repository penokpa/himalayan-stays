"use client";

export default function PrintButton({ bookingRef }: { bookingRef: string }) {
  return (
    <a
      href={`/api/bookings/${bookingRef}/pdf`}
      target="_blank"
      rel="noopener"
      className="rounded-lg bg-emerald-700 px-6 py-2.5 text-center text-sm font-medium text-white shadow-sm transition hover:bg-emerald-800"
    >
      Download PDF
    </a>
  );
}
