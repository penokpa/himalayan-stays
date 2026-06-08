export const dynamic = "force-dynamic";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ReviewReplyForm from "@/components/ReviewReplyForm";

function fmt(d: Date): string {
  return new Date(d).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default async function OwnerReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const session = await auth();
  const userId = session?.user?.id;
  const role = session?.user?.role;
  if (!userId) return <p className="text-gray-500">Not authenticated.</p>;

  const sp = await searchParams;
  const filter = sp.filter === "unreplied" ? "unreplied" : sp.filter === "replied" ? "replied" : "all";

  const lodgeFilter =
    role === "ADMIN" ? {} : { lodge: { ownerId: userId } };

  const replyFilter =
    filter === "unreplied"
      ? { ownerReply: null }
      : filter === "replied"
      ? { ownerReply: { not: null } }
      : {};

  const [reviews, totalCount, unrepliedCount] = await Promise.all([
    prisma.review.findMany({
      where: { ...lodgeFilter, ...replyFilter },
      orderBy: [{ ownerReply: { sort: "asc", nulls: "first" } }, { createdAt: "desc" }],
      include: {
        user: { select: { name: true, nationality: true } },
        lodge: { select: { name: true, slug: true } },
      },
    }),
    prisma.review.count({ where: lodgeFilter }),
    prisma.review.count({ where: { ...lodgeFilter, ownerReply: null } }),
  ]);

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-bold text-gray-900">Reviews</h1>
        <p className="text-sm text-gray-500">
          {totalCount} total · {unrepliedCount} awaiting your reply
        </p>
      </div>
      <p className="mt-1 text-sm text-gray-500">
        Replies appear publicly under each review on your lodge page.
      </p>

      {/* Filter tabs */}
      <div className="mt-5 inline-flex rounded-lg border border-gray-200 bg-white p-1 text-sm shadow-sm">
        {[
          { key: "all", label: "All" },
          { key: "unreplied", label: `Unreplied (${unrepliedCount})` },
          { key: "replied", label: "Replied" },
        ].map((t) => (
          <Link
            key={t.key}
            href={t.key === "all" ? "/owner/reviews" : `/owner/reviews?filter=${t.key}`}
            className={`rounded-md px-3 py-1.5 font-medium transition ${
              filter === t.key
                ? "bg-emerald-700 text-white"
                : "text-gray-700 hover:bg-gray-50"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <div className="mt-6 space-y-4">
        {reviews.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center text-sm text-gray-500">
            {filter === "unreplied"
              ? "All caught up — no reviews are waiting for a reply."
              : filter === "replied"
              ? "You haven't replied to any reviews yet."
              : "No reviews on your lodges yet."}
          </div>
        ) : (
          reviews.map((r) => (
            <article
              key={r.id}
              className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="min-w-0">
                  <div
                    className="flex items-center gap-1"
                    aria-label={`${r.rating} out of 5 stars`}
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <svg
                        key={n}
                        className={`h-4 w-4 ${n <= r.rating ? "fill-amber-400" : "fill-gray-200"}`}
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.05 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.539 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.539-1.118l1.519-4.674a1 1 0 00-.363-1.118L2.075 10.1c-.783-.57-.38-1.81.588-1.81h4.915a1 1 0 00.95-.69l1.519-4.674z" />
                      </svg>
                    ))}
                  </div>
                  <p className="mt-1 text-sm">
                    <span className="font-medium text-gray-900">{r.user.name}</span>
                    {r.user.nationality && (
                      <span className="text-gray-500"> · {r.user.nationality}</span>
                    )}
                    <span className="text-gray-400"> · {fmt(r.createdAt)}</span>
                  </p>
                </div>
                <Link
                  href={`/lodge/${r.lodge.slug}`}
                  className="text-xs font-medium text-emerald-700 hover:underline"
                >
                  {r.lodge.name} ↗
                </Link>
              </div>

              {r.comment && (
                <p className="mt-3 text-sm leading-relaxed text-gray-700">
                  {r.comment}
                </p>
              )}

              <ReviewReplyForm
                reviewId={r.id}
                initialReply={r.ownerReply}
                initialReplyAt={r.ownerReplyAt}
              />
            </article>
          ))
        )}
      </div>
    </>
  );
}
