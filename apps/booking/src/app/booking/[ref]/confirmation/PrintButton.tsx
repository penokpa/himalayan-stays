"use client";

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="rounded-lg bg-emerald-700 px-6 py-2.5 text-center text-sm font-medium text-white shadow-sm transition hover:bg-emerald-800"
    >
      Print Confirmation
    </button>
  );
}
