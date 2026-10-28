import type { LucideIcon } from "lucide-react";

export function StatCard({
  label, value, sub, icon: Icon, size = "md",
}: {
  label: string; value: string; sub?: string; icon?: LucideIcon; size?: "md" | "sm";
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 md:p-5">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {label}
      </div>
      <div className={"mt-1.5 font-semibold tracking-tight tabular-nums " + (size === "md" ? "text-2xl" : "text-xl")}>{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}
