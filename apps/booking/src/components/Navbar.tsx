"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

export default function Navbar() {
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="border-b border-stone-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Brand */}
        <Link
          href="/"
          className="text-lg font-bold tracking-tight text-stone-900"
        >
          Himalayan{" "}
          <span className="text-emerald-700">Stays</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-6 sm:flex">
          <Link
            href="/treks"
            className="text-sm font-medium text-stone-600 transition hover:text-emerald-700"
          >
            Explore Treks
          </Link>

          {session?.user ? (
            <div className="flex items-center gap-4">
              <span className="text-sm text-stone-500">
                {session.user.name}
              </span>
              <button
                onClick={() => signOut()}
                className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 transition hover:bg-stone-50"
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

        {/* Mobile hamburger */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="rounded-md p-2 text-stone-600 hover:bg-stone-100 sm:hidden"
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

      {/* Mobile menu */}
      {menuOpen && (
        <div className="border-t border-stone-100 px-4 py-3 sm:hidden">
          <Link
            href="/treks"
            onClick={() => setMenuOpen(false)}
            className="block py-2 text-sm font-medium text-stone-600 hover:text-emerald-700"
          >
            Explore Treks
          </Link>

          {session?.user ? (
            <>
              <span className="block py-2 text-sm text-stone-500">
                {session.user.name}
              </span>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  signOut();
                }}
                className="block w-full py-2 text-left text-sm font-medium text-stone-600 hover:text-emerald-700"
              >
                Sign Out
              </button>
            </>
          ) : (
            <Link
              href="/login"
              onClick={() => setMenuOpen(false)}
              className="block py-2 text-sm font-medium text-emerald-700"
            >
              Sign In
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}
