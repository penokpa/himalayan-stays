"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface Props {
  token: string;
  email: string | null;
  invalidReason: string | null;
}

export default function ResetPasswordForm({ token, email, invalidReason }: Props) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Reset failed");
      } else {
        setDone(true);
        setTimeout(() => router.push("/login"), 1800);
      }
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-50 px-4 dark:bg-stone-950">
      <div className="w-full max-w-md">
        <div className="rounded-xl bg-white p-8 shadow-sm ring-1 ring-stone-200 dark:bg-stone-900 dark:ring-stone-800">
          <h1 className="text-center text-2xl font-bold text-stone-900 dark:text-stone-100">
            Set a new password
          </h1>
          {email && !invalidReason && (
            <p className="mt-2 text-center text-sm text-stone-500 dark:text-stone-400">
              For <strong className="text-stone-700 dark:text-stone-200">{email}</strong>
            </p>
          )}

          {invalidReason ? (
            <div className="mt-6 rounded-lg bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200 dark:bg-amber-950/30 dark:text-amber-200 dark:ring-amber-900">
              <p className="font-medium">Link unusable</p>
              <p className="mt-1">{invalidReason}</p>
              <p className="mt-3">
                <Link
                  href="/forgot-password"
                  className="font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
                >
                  Request a new link →
                </Link>
              </p>
            </div>
          ) : done ? (
            <div className="mt-6 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-900 ring-1 ring-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-200 dark:ring-emerald-900">
              <p className="font-medium">Password updated.</p>
              <p className="mt-1">Redirecting to sign in…</p>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-6 space-y-4">
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-stone-700 dark:text-stone-300"
                >
                  New password
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-stone-900 shadow-sm placeholder:text-stone-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
                />
                <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                  At least 8 characters.
                </p>
              </div>
              <div>
                <label
                  htmlFor="confirm"
                  className="block text-sm font-medium text-stone-700 dark:text-stone-300"
                >
                  Confirm password
                </label>
                <input
                  id="confirm"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-stone-900 shadow-sm placeholder:text-stone-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              )}

              <button
                type="submit"
                disabled={submitting || !password || !confirm}
                className="w-full rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "Saving…" : "Update password"}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
