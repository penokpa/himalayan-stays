export const dynamic = "force-dynamic";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import TrekkerReplyForm from "@/components/TrekkerReplyForm";

function fmtTime(d: Date): string {
  return new Date(d).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export const metadata = {
  title: "Conversation",
  robots: { index: false, follow: false },
};

export default async function TrekkerThreadPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const thread = await prisma.messageThread.findUnique({
    where: { accessToken: token },
    include: {
      lodge: { select: { name: true, slug: true, village: true } },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!thread) notFound();

  if (thread.trekkerUnread > 0) {
    await prisma.messageThread.update({
      where: { id: thread.id },
      data: { trekkerUnread: 0 },
    });
  }

  return (
    <main className="min-h-screen bg-stone-50">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <Link
          href={`/lodge/${thread.lodge.slug}`}
          className="text-sm font-medium text-emerald-700 hover:underline"
        >
          ← Back to {thread.lodge.name}
        </Link>

        <div className="mt-4 rounded-xl bg-white p-5 shadow-sm ring-1 ring-stone-200">
          <h1 className="text-xl font-bold text-stone-900">{thread.subject}</h1>
          <p className="mt-1 text-sm text-stone-500">
            Conversation with{" "}
            <Link
              href={`/lodge/${thread.lodge.slug}`}
              className="font-medium text-emerald-700 hover:underline"
            >
              {thread.lodge.name}
            </Link>
            {thread.lodge.village && ` · ${thread.lodge.village}`}
          </p>
        </div>

        <div className="mt-5 space-y-3">
          {thread.messages.map((m) => {
            const isTrekker = m.sender === "TREKKER";
            return (
              <div
                key={m.id}
                className={`flex ${isTrekker ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm ${
                    isTrekker
                      ? "bg-emerald-700 text-white"
                      : "bg-white text-stone-900 ring-1 ring-stone-200"
                  }`}
                >
                  <p
                    className={`mb-1 text-xs font-medium ${
                      isTrekker ? "text-emerald-100" : "text-stone-500"
                    }`}
                  >
                    {isTrekker ? "You" : thread.lodge.name} · {fmtTime(m.createdAt)}
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
          <TrekkerReplyForm token={token} closed={thread.status === "CLOSED"} />
        </div>

        <p className="mt-6 text-center text-xs text-stone-400">
          Bookmark this page or use the link in your email to come back to this conversation.
        </p>
      </div>
    </main>
  );
}
