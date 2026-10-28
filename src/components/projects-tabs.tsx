import { Link } from "@tanstack/react-router";

const tabs = [
  { to: "/projects", label: "Projects" },
  { to: "/projects/boards", label: "Boards" },
] as const;

export function ProjectsTabs({ active }: { active: (typeof tabs)[number]["to"] }) {
  return (
    <div className="inline-flex items-center rounded-lg bg-muted p-1 text-sm">
      {tabs.map((t) => (
        <Link
          key={t.to}
          to={t.to}
          className={
            "rounded-md px-3 py-1.5 transition-colors " +
            (t.to === active
              ? "bg-background text-foreground font-medium shadow-sm"
              : "text-muted-foreground hover:text-foreground")
          }
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
