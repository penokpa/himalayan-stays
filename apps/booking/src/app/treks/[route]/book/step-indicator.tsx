"use client";

import { usePathname } from "next/navigation";

const STEPS = [
  { label: "Itinerary", segment: "" },
  { label: "Lodges & Rooms", segment: "/lodges" },
  { label: "Details", segment: "/details" },
  { label: "Review", segment: "/review" },
];

export default function StepIndicator() {
  const pathname = usePathname();

  // Determine current step from pathname
  const bookBase = pathname.split("/book")[0] + "/book";
  const suffix = pathname.slice(bookBase.length);
  // /custom is also part of the Itinerary step
  const normalized = suffix === "/custom" ? "" : suffix;
  const currentIndex = STEPS.findIndex((s) => s.segment === normalized);
  const activeStep = currentIndex >= 0 ? currentIndex : 0;

  return (
    <div className="mt-6 mb-8">
      <div className="flex items-center justify-between">
        {STEPS.map((step, i) => (
          <div key={step.label} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                  i < activeStep
                    ? "bg-emerald-700 text-white"
                    : i === activeStep
                      ? "bg-emerald-700 text-white ring-2 ring-emerald-300 ring-offset-2"
                      : "bg-stone-200 text-stone-500"
                }`}
              >
                {i < activeStep ? (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              <span
                className={`mt-1.5 text-xs font-medium ${
                  i <= activeStep ? "text-emerald-700" : "text-stone-400"
                }`}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`mx-2 h-0.5 flex-1 ${
                  i < activeStep ? "bg-emerald-700" : "bg-stone-200"
                }`}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
