import { notFound } from "next/navigation";
import Link from "next/link";
import { SLUG_TO_ROUTE } from "@/lib/trek-routes";
import { ItineraryBuilderProvider } from "./context";
import StepIndicator from "./step-indicator";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ route: string }>;
}) {
  const { route } = await params;
  const info = SLUG_TO_ROUTE[route];
  if (!info) return { title: "Not Found" };
  return { title: `Book ${info.name} Trek | Himalayan Stays` };
}

export default async function BookTrekLayout({
  params,
  children,
}: {
  params: Promise<{ route: string }>;
  children: React.ReactNode;
}) {
  const { route } = await params;
  const info = SLUG_TO_ROUTE[route];
  if (!info) notFound();

  return (
    <main className="min-h-screen bg-stone-50">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <Link
          href={`/treks/${route}`}
          className="text-sm font-medium text-emerald-700 hover:underline"
        >
          &larr; Back to {info.name}
        </Link>

        <h1 className="mt-4 text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
          Book Your {info.name} Trek
        </h1>

        <StepIndicator />

        <ItineraryBuilderProvider trekRoute={info.key} trekRouteName={info.name}>
          {children}
        </ItineraryBuilderProvider>
      </div>
    </main>
  );
}
