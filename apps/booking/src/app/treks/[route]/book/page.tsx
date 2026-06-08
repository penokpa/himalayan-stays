"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useItineraryBuilder, type ItineraryStop } from "./context";

interface TemplateLodge {
  id: string;
  name: string;
  village: string;
  altitudeMeters: number | null;
  photo: string | null;
}

interface TemplateStop {
  id: string;
  dayNumber: number;
  nights: number;
  notes: string | null;
  lodge: TemplateLodge;
}

interface Template {
  id: string;
  name: string;
  totalDays: number;
  description: string | null;
  stops: TemplateStop[];
}

export default function ItinerarySelectionPage() {
  const { route } = useParams<{ route: string }>();
  const router = useRouter();
  const ctx = useItineraryBuilder();

  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(ctx.templateId);

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    fetch(`/api/itineraries?trekRoute=${ctx.trekRoute}`)
      .then((r) => r.json())
      .then((data) => setTemplates(data.itineraries ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [ctx.trekRoute]);

  function selectTemplate(t: Template) {
    setSelectedId(t.id);
    ctx.setTemplateId(t.id);
    ctx.setItineraryName(t.name);

    const stops: ItineraryStop[] = t.stops.map((s) => ({
      dayNumber: s.dayNumber,
      nights: s.nights,
      lodgeId: s.lodge.id,
      lodgeName: s.lodge.name,
      lodgeVillage: s.lodge.village,
      lodgeAltitude: s.lodge.altitudeMeters,
      roomId: "",
      roomName: "",
      roomType: "",
      pricePerNight: 0,
    }));
    ctx.setStops(stops);
  }

  function handleContinue() {
    if (!ctx.startDate || ctx.stops.length === 0) return;
    router.push(`/treks/${route}/book/lodges`);
  }

  const canContinue = ctx.startDate && ctx.stops.length > 0;

  return (
    <div className="space-y-8">
      {/* Start Date */}
      <div>
        <label htmlFor="startDate" className="block text-sm font-medium text-stone-700">
          Trek Start Date
        </label>
        <input
          id="startDate"
          type="date"
          required
          min={today}
          value={ctx.startDate}
          onChange={(e) => ctx.setStartDate(e.target.value)}
          className="mt-1.5 w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-stone-900 shadow-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none sm:max-w-xs"
        />
      </div>

      {/* Build your own CTA */}
      <button
        type="button"
        onClick={() => {
          if (!ctx.startDate) {
            alert("Pick a trek start date first.");
            return;
          }
          ctx.setTemplateId(null);
          ctx.setItineraryName("Custom EBC Trek");
          router.push(`/treks/${route}/book/custom`);
        }}
        className="flex w-full items-center justify-between gap-4 rounded-xl border-2 border-dashed border-emerald-300 bg-emerald-50 p-5 text-left transition hover:border-emerald-500 hover:bg-emerald-100"
      >
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-emerald-900">Build your own trek</p>
          <p className="mt-0.5 text-sm text-emerald-800">
            Pick exactly which villages, lodges, and how many nights at each.
          </p>
        </div>
        <span className="shrink-0 text-emerald-700">→</span>
      </button>

      {/* Templates */}
      <div>
        <h2 className="text-lg font-semibold text-stone-900">Or start from a template</h2>
        <p className="mt-1 text-sm text-stone-500">
          Recommended itineraries based on common trek patterns.
        </p>

        {loading ? (
          <div className="mt-6 text-center text-stone-400">Loading itineraries...</div>
        ) : templates.length === 0 ? (
          <div className="mt-6 rounded-lg border border-dashed border-stone-300 p-8 text-center text-stone-500">
            No template itineraries available for this route yet.
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {templates.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => selectTemplate(t)}
                className={`w-full rounded-xl bg-white p-5 text-left shadow-sm ring-1 transition ${
                  selectedId === t.id
                    ? "ring-2 ring-emerald-600"
                    : "ring-stone-200 hover:ring-emerald-300 hover:shadow-md"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-stone-900">{t.name}</h3>
                    <p className="mt-0.5 text-sm text-stone-500">
                      {t.totalDays} days &middot; {t.stops.length} stops
                    </p>
                  </div>
                  {selectedId === t.id && (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-700">
                      <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>

                {t.description && (
                  <p className="mt-2 text-sm text-stone-600">{t.description}</p>
                )}

                <div className="mt-3 flex flex-wrap gap-2">
                  {t.stops.map((s) => (
                    <span
                      key={s.id}
                      className="inline-flex items-center rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-700"
                    >
                      Day {s.dayNumber} &middot; {s.lodge.name}
                      {s.lodge.altitudeMeters && (
                        <span className="ml-1 text-stone-400">
                          {s.lodge.altitudeMeters.toLocaleString()}m
                        </span>
                      )}
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Continue */}
      <button
        type="button"
        disabled={!canContinue}
        onClick={handleContinue}
        className="w-full rounded-lg bg-emerald-700 px-6 py-3 text-lg font-semibold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Continue to Lodge & Room Selection
      </button>
    </div>
  );
}
