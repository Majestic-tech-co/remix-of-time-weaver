import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Clock, Users, FolderKanban, ListChecks, Timer } from "lucide-react";
import type { ReactNode } from "react";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/timesheets", label: "Timesheets", icon: Clock },
  { to: "/customers", label: "Customers", icon: Users },
  { to: "/projects", label: "Projects", icon: FolderKanban },
  { to: "/activities", label: "Activities", icon: ListChecks },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="min-h-screen flex w-full bg-background text-foreground">
      <aside className="hidden md:flex md:flex-col w-60 shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
        <div className="h-16 flex items-center gap-2 px-5 border-b border-sidebar-border">
          <div className="grid h-9 w-9 place-items-center rounded-md bg-primary text-primary-foreground">
            <Timer className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-tight">Tempo</div>
            <div className="text-[11px] text-muted-foreground">Time tracking</div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {nav.map((item) => {
            const active = item.exact ? pathname === item.to : pathname === item.to || pathname.startsWith(item.to + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors " +
                  (active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground")
                }
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 text-[11px] text-muted-foreground border-t border-sidebar-border">
          Local-first · saved in browser
        </div>
      </aside>

      {/* Mobile top nav */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden h-14 border-b border-border flex items-center px-4 gap-3 bg-sidebar">
          <div className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground">
            <Timer className="h-4 w-4" />
          </div>
          <span className="font-semibold">Tempo</span>
        </header>
        <nav className="md:hidden flex overflow-x-auto gap-1 px-3 py-2 border-b border-border bg-sidebar">
          {nav.map((item) => {
            const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={
                  "shrink-0 rounded-md px-3 py-1.5 text-xs " +
                  (active ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "text-muted-foreground")
                }
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <main className="flex-1 min-w-0 overflow-x-hidden">
          <div className="mx-auto max-w-7xl px-4 md:px-8 py-6 md:py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
