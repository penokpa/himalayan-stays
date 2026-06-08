import { formatMoney } from "@/lib/currency";
import { getCurrency } from "@/lib/currency-server";

/** Server component that renders an NPR amount in the user's selected display currency. */
export default async function Money({
  npr,
  className,
}: {
  npr: number;
  className?: string;
}) {
  const currency = await getCurrency();
  return <span className={className}>{formatMoney(npr, currency)}</span>;
}
