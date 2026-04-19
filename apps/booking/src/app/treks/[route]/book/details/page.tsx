"use client";

import { useParams, useRouter } from "next/navigation";
import { useItineraryBuilder } from "../context";

export default function TravelerDetailsPage() {
  const { route } = useParams<{ route: string }>();
  const router = useRouter();
  const ctx = useItineraryBuilder();

  const canContinue =
    ctx.traveler.name.trim() &&
    ctx.traveler.email.trim() &&
    ctx.traveler.groupSize >= 1;

  function handleContinue(e: React.FormEvent) {
    e.preventDefault();
    if (!canContinue) return;
    router.push(`/treks/${route}/book/review`);
  }

  return (
    <form onSubmit={handleContinue} className="space-y-6">
      <p className="text-sm text-stone-500">
        Enter the lead traveler&apos;s details for this booking.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="guestName" className="block text-sm font-medium text-stone-700">
            Full Name
          </label>
          <input
            id="guestName"
            type="text"
            required
            value={ctx.traveler.name}
            onChange={(e) => ctx.setTraveler({ name: e.target.value })}
            placeholder="Full name"
            className="mt-1.5 w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-stone-900 shadow-sm placeholder:text-stone-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="guestEmail" className="block text-sm font-medium text-stone-700">
            Email
          </label>
          <input
            id="guestEmail"
            type="email"
            required
            value={ctx.traveler.email}
            onChange={(e) => ctx.setTraveler({ email: e.target.value })}
            placeholder="email@example.com"
            className="mt-1.5 w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-stone-900 shadow-sm placeholder:text-stone-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label htmlFor="groupSize" className="block text-sm font-medium text-stone-700">
          Group Size
        </label>
        <input
          id="groupSize"
          type="number"
          required
          min={1}
          max={20}
          value={ctx.traveler.groupSize}
          onChange={(e) => ctx.setTraveler({ groupSize: Number(e.target.value) })}
          className="mt-1.5 w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-stone-900 shadow-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none sm:max-w-xs"
        />
      </div>

      <div>
        <label htmlFor="specialRequests" className="block text-sm font-medium text-stone-700">
          Special Requests <span className="text-stone-400">(optional)</span>
        </label>
        <textarea
          id="specialRequests"
          rows={3}
          value={ctx.traveler.specialRequests}
          onChange={(e) => ctx.setTraveler({ specialRequests: e.target.value })}
          placeholder="Dietary requirements, arrival time, etc."
          className="mt-1.5 w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-stone-900 shadow-sm placeholder:text-stone-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
        />
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => router.push(`/treks/${route}/book/lodges`)}
          className="rounded-lg border border-stone-300 bg-white px-6 py-3 text-sm font-medium text-stone-700 transition hover:bg-stone-50"
        >
          Back
        </button>
        <button
          type="submit"
          disabled={!canContinue}
          className="flex-1 rounded-lg bg-emerald-700 px-6 py-3 text-lg font-semibold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Continue to Review
        </button>
      </div>
    </form>
  );
}
