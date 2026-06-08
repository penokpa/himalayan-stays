export const dynamic = "force-dynamic";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import OwnerReplyForm from "@/components/OwnerReplyForm";

function fmtTime(d: Date): string {
  return new Date(d).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function OwnerThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const userId = session?.user?.id;
  const role = session?.user?.role;
  if (!userId) redirect("/login");

  const { id } = await params;
  const thread = await prisma.messageThread.findUnique({
    where: { id },
    include: {
      lodge: { select: { name: true, slug: true, ownerId: true } },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!thread) notFound();
  if (role !== "ADMIN" && thread.lodge.ownerId !== userId) {
    return <p className="text-red-600">You don&apos;t own this lodge.</p>;
  }

  if (thread.ownerUnread > 0) {
    await prisma.messageThread.update({
      where: { id: thread.id },
      data: { ownerUnread: 0 },
    });
  }

  return (
    <>
      <Link
        href="/owner/messages"
        className="text-sm font-medium text-emerald-700 hover:underline"
      >
        ← Back to inbox
      </Link>

      <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-xl font-bold text-gray-900">{thread.subject}</h1>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              thread.status === "OPEN"
                ? "bg-emerald-50 text-emerald-700"
                : "bg-stone-100 text-stone-600"
            }`}
          >
            {thread.status}
          </span>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          From <span className="font-medium text-gray-700">{thread.trekkerName}</span> ·{" "}
          <a
            href={`mailto:${thread.trekkerEmail}`}
            className="text-emerald-700 hover:underline"
          >
            {thread.trekkerEmail}
          </a>{" "}
          · About{" "}
          <Link
            href={`/lodge/${thread.lodge.slug}`}
            className="text-emerald-700 hover:underline"
          >
            {thread.lodge.name}
          </Link>
        </p>
      </div>

      <div className="mt-5 space-y-3">
        {thread.messages.map((m) => {
          const isOwner = m.sender === "OWNER";
          return (
            <div
              key={m.id}
              className={`flex ${isOwner ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm ${
                  isOwner
                    ? "bg-emerald-700 text-white"
                    : "bg-white text-gray-900 ring-1 ring-gray-200"
                }`}
              >
                <p
                  className={`mb-1 text-xs font-medium ${
                    isOwner ? "text-emerald-100" : "text-gray-500"
                  }`}
                >
                  {isOwner ? "You" : thread.trekkerName} · {fmtTime(m.createdAt)}
                </p>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {m.body}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6">
        <OwnerReplyForm threadId={thread.id} closed={thread.status === "CLOSED"} />
      </div>
    </>
  );
}
