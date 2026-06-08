export const dynamic = "force-dynamic";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const metadata = {
  title: "Verify email | Himalayan Stays",
  robots: { index: false, follow: false },
};

export default async function VerifyEmailPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // Resolve outcome and (if valid) mark verified — idempotent for "already used"
  type Outcome =
    | { kind: "success"; email: string }
    | { kind: "already"; email: string }
    | { kind: "invalid" }
    | { kind: "expired" };
  let outcome: Outcome = { kind: "invalid" };

  const record = await prisma.emailVerification.findUnique({
    where: { token },
    include: { user: { select: { id: true, email: true, emailVerifiedAt: true } } },
  });

  if (record) {
    if (record.user.emailVerifiedAt) {
      outcome = { kind: "already", email: record.user.email ?? "" };
    } else if (record.expiresAt < new Date()) {
      outcome = { kind: "expired" };
    } else {
      await prisma.$transaction([
        prisma.user.update({
          where: { id: record.userId },
          data: { emailVerifiedAt: new Date() },
        }),
        prisma.emailVerification.update({
          where: { id: record.id },
          data: { usedAt: new Date() },
        }),
        prisma.emailVerification.updateMany({
          where: { userId: record.userId, usedAt: null, id: { not: record.id } },
          data: { usedAt: new Date() },
        }),
      ]);
      outcome = { kind: "success", email: record.user.email ?? "" };
    }
  }

  return (
    <main className="flex min-h-[80vh] items-center justify-center bg-stone-50 px-4 dark:bg-stone-950">
      <div className="w-full max-w-md">
        <div className="rounded-xl bg-white p-8 text-center shadow-sm ring-1 ring-stone-200 dark:bg-stone-900 dark:ring-stone-800">
          {(outcome.kind === "success" || outcome.kind === "already") && (
            <>
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <h1 className="mt-4 text-2xl font-bold text-stone-900 dark:text-stone-100">
                {outcome.kind === "already" ? "Email already verified" : "Email verified!"}
              </h1>
              <p className="mt-2 text-sm text-stone-600 dark:text-stone-300">
                {outcome.kind === "already"
                  ? "This email is already confirmed. You can sign in."
                  : "Your account is ready. Sign in to start booking treks."}
              </p>
              <p className="mt-1 text-xs text-stone-400 dark:text-stone-500">
                {outcome.email}
              </p>
              <Link
                href="/login"
                className="mt-6 inline-block rounded-lg bg-emerald-700 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800"
              >
                Sign in
              </Link>
            </>
          )}
          {outcome.kind === "expired" && (
            <>
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z" />
                </svg>
              </div>
              <h1 className="mt-4 text-2xl font-bold text-stone-900 dark:text-stone-100">
                Link expired
              </h1>
              <p className="mt-2 text-sm text-stone-600 dark:text-stone-300">
                This verification link expired. Sign in and we&apos;ll send you a new one.
              </p>
              <Link
                href="/login"
                className="mt-6 inline-block rounded-lg bg-emerald-700 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800"
              >
                Back to sign in
              </Link>
            </>
          )}
          {outcome.kind === "invalid" && (
            <>
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400">
                <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h1 className="mt-4 text-2xl font-bold text-stone-900 dark:text-stone-100">
                Invalid link
              </h1>
              <p className="mt-2 text-sm text-stone-600 dark:text-stone-300">
                This verification link doesn&apos;t exist. Check the URL or sign in to request a new one.
              </p>
              <Link
                href="/login"
                className="mt-6 inline-block rounded-lg bg-emerald-700 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800"
              >
                Back to sign in
              </Link>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
