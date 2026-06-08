interface Props {
  className?: string;
  rounded?: "sm" | "md" | "lg" | "xl" | "full";
}

const ROUNDED: Record<NonNullable<Props["rounded"]>, string> = {
  sm: "rounded-sm",
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-xl",
  full: "rounded-full",
};

export default function Skeleton({ className = "", rounded = "md" }: Props) {
  return (
    <div
      aria-hidden
      className={`animate-pulse bg-stone-200 dark:bg-stone-800 ${ROUNDED[rounded]} ${className}`}
    />
  );
}
