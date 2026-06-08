"use client";

import { useState } from "react";

interface Props {
  lodgeSlug: string;
  lodgeName: string;
}

export default function AskLodgeForm({ lodgeSlug, lodgeName }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<
    | { ok: true; threadUrl: string }
    | { ok: false; error: string }
    | null
  >(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setResult(null);
    try {
      const res = await fetch(`/api/lodges/${lodgeSlug}/messages`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, email, subject, message }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setResult({ ok: false, error: data.error ?? "Failed to send" });
      } else {
        setResult({ ok: true, threadUrl: data.threadUrl });
        setName("");
        setEmail("");
        setSubject("");
        setMessage("");
      }
    } catch {
      setResult({ ok: false, error: "Network error" });
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-800 shadow-sm transition hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:hover:bg-stone-800"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.068.157 2.148.279 3.238.364.466.037.893.281 1.153.671L12 21l2.652-3.978c.26-.39.687-.634 1.153-.67 1.09-.086 2.17-.208 3.238-.365 1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
        </svg>
        Ask the lodge
      </button>
    );
  }

  if (result?.ok) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
        <p className="font-medium">Message sent to {lodgeName}.</p>
        <p className="mt-1 text-emerald-800 dark:text-emerald-300">
          We sent you an email with a link to follow the conversation. You can also{" "}
          <a href={result.threadUrl} className="font-semibold underline">
            view it now
          </a>
          .
        </p>
        <button
          type="button"
          onClick={() => {
            setResult(null);
            setOpen(false);
          }}
          className="mt-3 text-xs font-semibold text-emerald-700 hover:underline"
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-3 rounded-lg border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900"
    >
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Ask {lodgeName}</h3>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs font-medium text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200"
        >
          Cancel
        </button>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="block text-xs font-medium text-stone-600 dark:text-stone-300">Your name</span>
          <input
            required
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:placeholder-stone-500"
          />
        </label>
        <label className="block">
          <span className="block text-xs font-medium text-stone-600 dark:text-stone-300">Your email</span>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:placeholder-stone-500"
          />
        </label>
      </div>
      <label className="block">
        <span className="block text-xs font-medium text-stone-600 dark:text-stone-300">
          Subject <span className="text-stone-400 dark:text-stone-500">(optional)</span>
        </span>
        <input
          type="text"
          maxLength={140}
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="e.g. Dorm bed availability mid-March"
          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:placeholder-stone-500"
        />
      </label>
      <label className="block">
        <span className="block text-xs font-medium text-stone-600">Message</span>
        <textarea
          required
          rows={4}
          maxLength={4000}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Ask about availability, route conditions, what to bring…"
          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:placeholder-stone-500"
        />
      </label>
      {result && !result.ok && (
        <p className="text-sm text-red-600">{result.error}</p>
      )}
      <div className="flex items-center justify-end gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 disabled:opacity-50"
        >
          {submitting ? "Sending…" : "Send message"}
        </button>
      </div>
      <p className="text-xs text-stone-500 dark:text-stone-400">
        We&apos;ll email you when the lodge replies — no account needed.
      </p>
    </form>
  );
}
