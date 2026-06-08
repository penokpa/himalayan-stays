export const dynamic = "force-dynamic";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWishlist } from "@/lib/wishlist-server";
import ProfileForm from "@/components/ProfileForm";

export const metadata = {
  title: "Your Profile | Himalayan Stays",
  robots: { index: false, follow: false },
};

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?next=/profile");
  }

  const [user, bookingCount, reviewCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        nationality: true,
        passportNumber: true,
        profilePhoto: true,
        createdAt: true,
        role: true,
      },
    }),
    prisma.booking.count({ where: { bookedById: session.user.id } }),
    prisma.review.count({ where: { userId: session.user.id } }),
  ]);
  if (!user) redirect("/login");

  const wishlist = await getWishlist();
  const memberSince = new Date(user.createdAt).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <main className="min-h-screen bg-stone-50 dark:bg-stone-950">
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
          Your Profile
        </h1>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          Member since {memberSince}
          {user.role !== "TREKKER" && (
            <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              {user.role.toLowerCase().replace("_", " ")}
            </span>
          )}
        </p>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-3 gap-3">
          <Stat label="Bookings" value={bookingCount} href="/my-bookings" />
          <Stat label="Reviews" value={reviewCount} />
          <Stat label="Saved" value={wishlist.length} href="/wishlist" />
        </div>

        {/* Edit form */}
        <div className="mt-8">
          <ProfileForm
            initial={{
              name: user.name,
              email: user.email ?? "",
              phone: user.phone ?? "",
              nationality: user.nationality ?? "",
              passportNumber: user.passportNumber ?? "",
              profilePhoto: user.profilePhoto ?? "",
            }}
          />
        </div>
      </div>
    </main>
  );
}

function Stat({ label, value, href }: { label: string; value: number; href?: string }) {
  const inner = (
    <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-stone-200 dark:bg-stone-900 dark:ring-stone-800">
      <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold text-stone-900 dark:text-stone-100">{value}</p>
    </div>
  );
  if (href) {
    return (
      <Link href={href} className="block transition hover:scale-[1.02]">
        {inner}
      </Link>
    );
  }
  return inner;
}
