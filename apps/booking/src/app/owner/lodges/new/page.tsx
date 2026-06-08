export const dynamic = "force-dynamic";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import NewLodgeForm from "@/components/NewLodgeForm";

export const metadata = {
  title: "Add a new lodge | Himalayan Stays",
  robots: { index: false, follow: false },
};

export default async function OwnerNewLodgePage() {
  const session = await auth();
  const role = session?.user?.role;
  if (!session?.user) redirect("/login?next=/owner/lodges/new");
  if (role !== "LODGE_OWNER" && role !== "ADMIN") {
    return (
      <p className="text-red-600">Only lodge owners and admins can add a lodge.</p>
    );
  }

  return (
    <>
      <Link
        href="/owner/lodges"
        className="text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400"
      >
        ← My Lodges
      </Link>

      <h1 className="mt-2 text-2xl font-bold text-gray-900 dark:text-stone-100">
        Add a new lodge
      </h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-stone-400">
        Tell us the basics. Once it&apos;s created you can add rooms, photos, and seasonal pricing,
        then publish it so trekkers can book.
      </p>

      <div className="mt-6">
        <NewLodgeForm />
      </div>
    </>
  );
}
