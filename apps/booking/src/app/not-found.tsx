import Link from "next/link";

export const metadata = {
  title: "Page not found | Himalayan Stays",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main className="flex min-h-[80vh] items-center justify-center bg-stone-50 px-4 dark:bg-stone-950">
      <div className="mx-auto max-w-lg text-center">
        {/* Mountain SVG illustration */}
        <svg
          className="mx-auto h-32 w-auto text-emerald-700 dark:text-emerald-500"
          viewBox="0 0 240 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden
        >
          <path
            d="M0 110 L60 30 L100 70 L140 10 L200 80 L240 50 L240 110 Z"
            fill="currentColor"
            opacity="0.18"
          />
          <path
            d="M0 110 L60 30 L100 70 L140 10 L200 80 L240 50"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
            fill="none"
          />
          <circle cx="140" cy="10" r="3" fill="currentColor" />
          <text
            x="148"
            y="14"
            fontSize="9"
            fill="currentColor"
            className="font-mono"
          >
            404
          </text>
        </svg>

        <h1 className="mt-8 text-4xl font-bold tracking-tight text-stone-900 dark:text-stone-100 sm:text-5xl">
          Off the trail
        </h1>
        <p className="mt-3 text-base text-stone-600 dark:text-stone-300">
          That page doesn&apos;t exist on our map. Let&apos;s get you back on route.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="rounded-lg bg-emerald-700 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800"
          >
            Back to home
          </Link>
          <Link
            href="/treks"
            className="rounded-lg border border-stone-300 bg-white px-6 py-2.5 text-sm font-medium text-stone-700 transition hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800"
          >
            Browse trek routes
          </Link>
        </div>

        <p className="mt-10 text-xs text-stone-400 dark:text-stone-500">
          If you typed the URL by hand, double-check the spelling. Otherwise the page may have moved.
        </p>
      </div>
    </main>
  );
}
