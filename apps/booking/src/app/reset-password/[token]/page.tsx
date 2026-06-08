export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import ResetPasswordForm from "./reset-form";

export const metadata = {
  title: "Reset Password | Himalayan Stays",
  robots: { index: false, follow: false },
};

export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const record = await prisma.passwordReset.findUnique({
    where: { token },
    select: {
      id: true,
      usedAt: true,
      expiresAt: true,
      user: { select: { email: true } },
    },
  });

  let invalidReason: string | null = null;
  if (!record) invalidReason = "This reset link doesn't exist or has been deleted.";
  else if (record.usedAt) invalidReason = "This reset link has already been used.";
  else if (record.expiresAt < new Date()) invalidReason = "This reset link has expired.";

  return (
    <ResetPasswordForm
      token={token}
      email={record?.user.email ?? null}
      invalidReason={invalidReason}
    />
  );
}
