"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import CurrencySwitcher from "@/components/CurrencySwitcher";
import ThemeToggle from "@/components/ThemeToggle";
import LodgeSearch from "@/components/LodgeSearch";
import { useWishlist } from "@/lib/use-wishlist";

export default function Navbar() {
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const { count: savedCount } = useWishlist();

  return (
    <nav className="border-b border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Brand */}
        <Link
          href="/"
          className="text-lg font-bold tracking-tight text-stone-900 dark:text-stone-100"
        >
          Himalayan{" "}
          <span className="text-emerald-700 dark:text-emerald-400">Stays</span>
        </Link>

        {/* Desktop search */}
        <div className="hidden flex-1 px-6 lg:flex lg:max-w-sm">
          <LodgeSearch />
        </div>

        {/* Desktop nav */}
        <div className="hidden items-center gap-6 sm:flex">
          <Link
            href="/treks"
            className="text-sm font-medium text-stone-600 transition hover:text-emerald-700 dark:text-stone-300 dark:hover:text-emerald-400"
          >
            Explore Treks
          </Link>

          <Link
            href="/my-bookings"
            className="text-sm font-medium text-stone-600 transition hover:text-emerald-700 dark:text-stone-300 dark:hover:text-emerald-400"
          >
            My Bookings
          </Link>

          <Link
            href="/wishlist"
            className="inline-flex items-center gap-1 text-sm font-medium text-stone-600 transition hover:text-emerald-700 dark:text-stone-300 dark:hover:text-emerald-400"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
            </svg>
            Saved
            {savedCount > 0 && (
              <span className="ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-100 px-1.5 text-xs font-semibold text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
                {savedCount}
              </span>
            )}
          </Link>

          <CurrencySwitcher />
          <ThemeToggle />

          {session?.user ? (
            <div className="flex items-center gap-3">
              <Link
                href="/profile"
                className="inline-flex items-center gap-2 rounded-lg px-2 py-1 text-sm font-medium text-stone-600 transition hover:bg-stone-50 hover:text-emerald-700 dark:text-stone-300 dark:hover:bg-stone-800 dark:hover:text-emerald-400"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                  {(session.user.name ?? "?").trim().charAt(0).toUpperCase()}
                </span>
                <span className="hidden md:inline">{session.user.name}</span>
              </Link>
              <button
                onClick={() => signOut()}
                className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 transition hover:bg-stone-50 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="rounded-lg bg-emerald-700 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-emerald-800"
            >
              Sign In
            </Link>
          )}
        </div>

        {/* Mobile right cluster */}
        <div className="flex items-center gap-1 sm:hidden">
          <ThemeToggle />
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="rounded-md p-2 text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
            aria-label="Toggle menu"
          >
            {menuOpen ? (
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            ) : (
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="border-t border-stone-100 px-4 py-3 dark:border-stone-800 sm:hidden">
          <div className="pb-3">
            <LodgeSearch />
          </div>
          <Link
            href="/treks"
            onClick={() => setMenuOpen(false)}
            className="block py-2 text-sm font-medium text-stone-600 hover:text-emerald-700 dark:text-stone-300 dark:hover:text-emerald-400"
          >
            Explore Treks
          </Link>

          <Link
            href="/my-bookings"
            onClick={() => setMenuOpen(false)}
            className="block py-2 text-sm font-medium text-stone-600 hover:text-emerald-700 dark:text-stone-300 dark:hover:text-emerald-400"
          >
            My Bookings
          </Link>

          <Link
            href="/wishlist"
            onClick={() => setMenuOpen(false)}
            className="block py-2 text-sm font-medium text-stone-600 hover:text-emerald-700 dark:text-stone-300 dark:hover:text-emerald-400"
          >
            Saved {savedCount > 0 ? `(${savedCount})` : ""}
          </Link>

          {session?.user ? (
            <>
              <Link
                href="/profile"
                onClick={() => setMenuOpen(false)}
                className="block py-2 text-sm font-medium text-stone-600 hover:text-emerald-700 dark:text-stone-300 dark:hover:text-emerald-400"
              >
                Profile
              </Link>
              <span className="block py-2 text-sm text-stone-500 dark:text-stone-400">
                {session.user.name}
              </span>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  signOut();
                }}
                className="block w-full py-2 text-left text-sm font-medium text-stone-600 hover:text-emerald-700 dark:text-stone-300 dark:hover:text-emerald-400"
              >
                Sign Out
              </button>
            </>
          ) : (
            <Link
              href="/login"
              onClick={() => setMenuOpen(false)}
              className="block py-2 text-sm font-medium text-emerald-700 dark:text-emerald-400"
            >
              Sign In
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}
