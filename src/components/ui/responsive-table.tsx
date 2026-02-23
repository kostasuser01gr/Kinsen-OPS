import { cn } from "@/lib/utils";

export function ResponsiveTableWrapper({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("w-full overflow-x-auto", className)}>
      <div className="min-w-[640px]">{children}</div>
    </div>
  );
}
