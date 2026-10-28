export function StatusDot({ active, label }: { active: boolean; label: string }) {
  return (
    <span className={"inline-flex items-center gap-1.5 text-xs " + (active ? "text-foreground" : "text-muted-foreground")}>
      <span className={"h-1.5 w-1.5 rounded-full " + (active ? "bg-success" : "bg-muted-foreground/50")} />
      {label}
    </span>
  );
}
