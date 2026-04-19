export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-stone-50 px-6 text-center">
      <h1 className="text-4xl font-bold tracking-tight text-stone-900 sm:text-5xl lg:text-6xl">
        Book Your Trek Across
        <br />
        <span className="text-emerald-700">Nepal's Mountain Lodges</span>
      </h1>

      <p className="mt-6 max-w-2xl text-lg text-stone-600">
        Plan multi-lodge itineraries for Everest Base Camp, Annapurna, and
        beyond. Reserve your beds, meals, and guides in one seamless booking.
      </p>

      <a
        href="/treks"
        className="mt-10 inline-block rounded-lg bg-emerald-700 px-8 py-3 text-lg font-semibold text-white shadow-sm transition hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
      >
        Explore Treks
      </a>
    </main>
  );
}
