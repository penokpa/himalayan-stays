export const dynamic = "force-dynamic";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function timeAgo(d: Date): string {
  const ms = Date.now() - new Date(d).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default async function OwnerMessagesPage() {
  const session = await auth();
  const userId = session?.user?.id;
  const role = session?.user?.role;
  if (!userId) return <p className="text-gray-500">Not authenticated.</p>;

  const lodgeFilter =
    role === "ADMIN" ? {} : { lodge: { ownerId: userId } };

  const threads = await prisma.messageThread.findMany({
    where: lodgeFilter,
    orderBy: { lastMessageAt: "desc" },
    include: {
      lodge: { select: { name: true, slug: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { body: true, sender: true, createdAt: true },
      },
    },
  });

  return (
    <>
      <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
      <p className="mt-1 text-sm text-gray-500">
        Questions from trekkers about your lodges.
      </p>

      <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {threads.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-400">
            No messages yet. When trekkers ask questions on your lodge page, they&apos;ll show up here.
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {threads.map((t) => {
              const last = t.messages[0];
              const preview = last?.body.slice(0, 140) ?? "";
              const isUnread = t.ownerUnread > 0;
              return (
                <li key={t.id}>
                  <Link
                    href={`/owner/messages/${t.id}`}
                    className={`flex items-start gap-3 px-4 py-4 transition hover:bg-gray-50 ${
                      isUnread ? "bg-emerald-50/40" : ""
                    }`}
                  >
                    <div
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                        isUnread ? "bg-emerald-500" : "bg-transparent"
                      }`}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p
                          className={`truncate text-sm ${
                            isUnread ? "font-semibold text-gray-900" : "font-medium text-gray-800"
                          }`}
                        >
                          {t.trekkerName}{" "}
                          <span className="font-normal text-gray-400">
                            · {t.lodge.name}
                          </span>
                        </p>
                        <span className="shrink-0 text-xs text-gray-400">
                          {timeAgo(t.lastMessageAt)}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-sm text-gray-600">
                        <span className="font-medium text-gray-700">{t.subject}</span>
                        {preview && (
                          <span className="text-gray-500"> — {preview}</span>
                        )}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-400">
                        {last?.sender === "OWNER" ? "You replied" : "Trekker wrote"} ·{" "}
                        {t.trekkerEmail}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
