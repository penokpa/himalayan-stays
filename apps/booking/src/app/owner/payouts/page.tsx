export const dynamic = "force-dynamic";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Period = "this_month" | "last_month" | "ytd" | "all";

const PERIOD_LABELS: Record<Period, string> = {
  this_month: "This month",
  last_month: "Last month",
  ytd: "Year to date",
  all: "All time",
};

function periodRange(p: Period): { from: Date | null; to: Date | null; label: string } {
  const now = new Date();
  if (p === "all") return { from: null, to: null, label: "All time" };
  if (p === "this_month") {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return { from, to, label: from.toLocaleDateString("en-US", { month: "long", year: "numeric" }) };
  }
  if (p === "last_month") {
    const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const to = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from, to, label: from.toLocaleDateString("en-US", { month: "long", year: "numeric" }) };
  }
  // ytd
  const from = new Date(now.getFullYear(), 0, 1);
  const to = new Date(now.getFullYear() + 1, 0, 1);
  return { from, to, label: `${now.getFullYear()} year-to-date` };
}

function StatCard({
  label,
  value,
  accent,
  hint,
}: {
  label: string;
  value: string;
  accent: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${accent}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

function formatNpr(n: number): string {
  return `NPR ${Math.round(n).toLocaleString()}`;
}

function formatDate(d: Date): string {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function OwnerPayoutsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const sp = await searchParams;
  const period: Period =
    sp.period === "last_month" || sp.period === "ytd" || sp.period === "all"
      ? sp.period
      : "this_month";
  const range = periodRange(period);

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return <p className="text-gray-500">Not authenticated.</p>;

  const lodges = await prisma.lodge.findMany({
    where: { ownerId: userId },
    select: { id: true, name: true, commissionPct: true },
  });
  if (lodges.length === 0) {
    return (
      <>
        <h1 className="text-2xl font-bold text-gray-900">Payouts</h1>
        <p className="mt-4 text-gray-500">You don&apos;t own any lodges yet.</p>
      </>
    );
  }
  const commissionByLodge = Object.fromEntries(
    lodges.map((l) => [l.id, Number(l.commissionPct)])
  );
  const lodgeNameById = Object.fromEntries(lodges.map((l) => [l.id, l.name]));

  // Find legs at owner's lodges where the parent booking was created in the period
  // (we use createdAt for "when the money came in", not check-in date)
  const where: {
    lodgeId: { in: string[] };
    status: { notIn: ["CANCELLED", "NO_SHOW"] };
    booking?: { createdAt?: { gte?: Date; lt?: Date } };
  } = {
    lodgeId: { in: lodges.map((l) => l.id) },
    status: { notIn: ["CANCELLED", "NO_SHOW"] },
  };
  if (range.from && range.to) {
    where.booking = { createdAt: { gte: range.from, lt: range.to } };
  }

  const legs = await prisma.bookingLeg.findMany({
    where,
    orderBy: { checkInDate: "desc" },
    include: {
      booking: {
        select: {
          id: true,
          bookingRef: true,
          status: true,
          paymentStatus: true,
          createdAt: true,
          bookedBy: { select: { name: true } },
          payments: { select: { method: true, status: true } },
        },
      },
      lodge: { select: { name: true } },
    },
  });

  // Categorize each leg
  type Settlement = "online_paid" | "cash_to_collect" | "cash_collected" | "awaiting";
  function settlementOf(leg: (typeof legs)[number]): Settlement {
    const b = leg.booking;
    const completed = b.payments.find((p) => p.status === "COMPLETED");
    const cashHold = b.payments.find(
      (p) => p.method === "CASH" && p.status === "INITIATED"
    );
    const cashDone = b.payments.find(
      (p) => p.method === "CASH" && p.status === "COMPLETED"
    );
    if (cashDone) return "cash_collected";
    if (completed) return "online_paid";
    if (cashHold && b.status === "CONFIRMED") return "cash_to_collect";
    return "awaiting";
  }

  let grossOnline = 0;
  let grossCashCollected = 0;
  let grossCashPending = 0;
  let commissionOnline = 0;
  let commissionCashCollected = 0;
  let commissionCashPending = 0;

  for (const leg of legs) {
    const gross = Number(leg.legTotal);
    const pct = commissionByLodge[leg.lodgeId] ?? 10;
    const commission = (gross * pct) / 100;
    const s = settlementOf(leg);
    if (s === "online_paid") {
      grossOnline += gross;
      commissionOnline += commission;
    } else if (s === "cash_collected") {
      grossCashCollected += gross;
      commissionCashCollected += commission;
    } else if (s === "cash_to_collect") {
      grossCashPending += gross;
      commissionCashPending += commission;
    }
  }

  // Money flows:
  // Platform owes lodge = (online gross - online commission) + (cash collected commission already with lodge - we already have the commission... actually)
  // Cleaner accounting:
  //  - Online payments: trekker paid platform → platform owes lodge (gross - commission)
  //  - Cash payments collected: lodge holds money → lodge owes platform (commission)
  const platformOwesYou = grossOnline - commissionOnline;
  const youOwePlatform = commissionCashCollected;
  const netOwedToYou = platformOwesYou - youOwePlatform;

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Payouts</h1>
        <div className="flex flex-wrap gap-1">
          {(["this_month", "last_month", "ytd", "all"] as Period[]).map((p) => {
            const active = p === period;
            return (
              <Link
                key={p}
                href={`/owner/payouts?period=${p}`}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  active
                    ? "bg-emerald-700 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {PERIOD_LABELS[p]}
              </Link>
            );
          })}
        </div>
      </div>
      <p className="mt-1 text-sm text-gray-500">{range.label}</p>

      {/* Net hero */}
      <div className="mt-6 rounded-xl border-2 border-emerald-200 bg-emerald-50 p-6">
        <p className="text-sm font-medium text-emerald-800">Net for the period</p>
        <p className="mt-1 text-3xl font-bold text-emerald-900">
          {netOwedToYou >= 0
            ? `Platform owes you ${formatNpr(netOwedToYou)}`
            : `You owe platform ${formatNpr(Math.abs(netOwedToYou))}`}
        </p>
        <p className="mt-2 text-xs text-emerald-700">
          = (online payouts owed to you) − (commission you owe on cash you collected)
        </p>
      </div>

      {/* Stats cards */}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Gross revenue"
          value={formatNpr(grossOnline + grossCashCollected + grossCashPending)}
          accent="text-gray-900"
          hint={`${legs.length} ${legs.length === 1 ? "stay" : "stays"}`}
        />
        <StatCard
          label="Online (platform collected)"
          value={formatNpr(grossOnline)}
          accent="text-emerald-600"
          hint={`Commission: ${formatNpr(commissionOnline)}`}
        />
        <StatCard
          label="Cash collected by you"
          value={formatNpr(grossCashCollected)}
          accent="text-amber-600"
          hint={`Commission: ${formatNpr(commissionCashCollected)}`}
        />
        <StatCard
          label="Cash to collect"
          value={formatNpr(grossCashPending)}
          accent="text-stone-600"
          hint={`Future commission: ${formatNpr(commissionCashPending)}`}
        />
      </div>

      {/* Per-booking breakdown */}
      <h2 className="mt-10 text-lg font-semibold text-gray-900">
        Bookings ({legs.length})
      </h2>
      <div className="mt-3 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Ref</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Guest</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Lodge</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Check-in</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Gross</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Commission</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Settlement</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Net to you</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {legs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-400">
                    No bookings in this period.
                  </td>
                </tr>
              ) : (
                legs.map((leg) => {
                  const gross = Number(leg.legTotal);
                  const pct = commissionByLodge[leg.lodgeId] ?? 10;
                  const commission = (gross * pct) / 100;
                  const s = settlementOf(leg);
                  let badge: { label: string; classes: string };
                  let net: number;
                  if (s === "online_paid") {
                    badge = { label: "Online · paid", classes: "bg-emerald-100 text-emerald-800" };
                    net = gross - commission;
                  } else if (s === "cash_collected") {
                    badge = { label: "Cash · collected", classes: "bg-emerald-100 text-emerald-800" };
                    net = -commission; // owe commission, kept the gross
                  } else if (s === "cash_to_collect") {
                    badge = { label: "Cash · pending", classes: "bg-amber-100 text-amber-800" };
                    net = 0;
                  } else {
                    badge = { label: "Awaiting payment", classes: "bg-gray-100 text-gray-600" };
                    net = 0;
                  }

                  return (
                    <tr key={leg.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-4 py-3 text-sm font-mono text-gray-900">
                        {leg.booking.bookingRef}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                        {leg.booking.bookedBy.name}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {lodgeNameById[leg.lodgeId]}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                        {formatDate(leg.checkInDate)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium text-gray-900">
                        {formatNpr(gross)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-700">
                        {formatNpr(commission)} <span className="text-xs text-gray-400">({pct}%)</span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.classes}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td
                        className={`whitespace-nowrap px-4 py-3 text-right text-sm font-bold ${
                          net > 0 ? "text-emerald-700" : net < 0 ? "text-red-700" : "text-gray-400"
                        }`}
                      >
                        {net === 0 ? "—" : `${net > 0 ? "+" : ""}${formatNpr(net)}`}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="mt-4 text-xs text-gray-400">
        Commission rate per lodge:{" "}
        {lodges
          .map((l) => `${l.name} ${Number(l.commissionPct)}%`)
          .join(" · ")}
      </p>
    </>
  );
}
