import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Clock, Users, FolderKanban, KanbanSquare, Timer, LogOut, Receipt, FileBarChart, Settings } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean };
const nav: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/timesheets", label: "Timesheets", icon: Clock },
  { to: "/customers", label: "Customers", icon: Users },
  { to: "/projects", label: "Projects", icon: FolderKanban, exact: true },
  { to: "/projects/boards", label: "Boards", icon: KanbanSquare },
];
const taxNav: NavItem[] = [
  { to: "/tax/receipts", label: "Receipts", icon: Receipt },
  { to: "/tax/reports", label: "Tax reports", icon: FileBarChart },
  { to: "/tax/settings", label: "Tax settings", icon: Settings },
];

function isActive(item: NavItem, pathname: string) {
  return item.exact ? pathname === item.to : pathname === item.to || pathname.startsWith(item.to + "/");
}

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = isActive(item, pathname);
  const Icon = item.icon;
  return (
    <Link
      to={item.to as never}
      className={
        "flex items-center gap-2.5 rounded-md px-2.5 h-9 text-sm transition-colors " +
        (active
          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
          : "text-sidebar-foreground/75 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground")
      }
    >
      <Icon className={"h-4 w-4 shrink-0 " + (active ? "text-primary" : "text-muted-foreground")} />
      {item.label}
    </Link>
  );
}

function BrandMark({ size = "md" }: { size?: "md" | "sm" }) {
  return (
    <div className={"grid place-items-center rounded-lg bg-primary text-primary-foreground " + (size === "md" ? "h-8 w-8" : "h-7 w-7")}>
      <Timer className={size === "md" ? "h-4 w-4" : "h-3.5 w-3.5"} />
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setEmail(session?.user.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/auth" });
  }

  return (
    <div className="min-h-screen flex w-full bg-background text-foreground">
      <aside className="hidden md:flex md:flex-col w-60 shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground sticky top-0 h-screen">
        <div className="h-14 flex items-center gap-2.5 px-4">
          <BrandMark />
          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-tight">Majestic</div>
            <div className="text-[11px] text-muted-foreground">Time tracking</div>
          </div>
        </div>
        <nav className="flex-1 px-3 pt-3 pb-3 overflow-y-auto">
          <div className="px-2.5 pb-1.5 text-[11px] font-medium text-muted-foreground">Workspace</div>
          <div className="space-y-0.5">
            {nav.map((item) => <NavLink key={item.to} item={item} pathname={pathname} />)}
          </div>
          <div className="px-2.5 pt-5 pb-1.5 text-[11px] font-medium text-muted-foreground">Tax</div>
          <div className="space-y-0.5">
            {taxNav.map((item) => <NavLink key={item.to} item={item} pathname={pathname} />)}
          </div>
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <div className="flex items-center gap-2.5 px-1">
            <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-sidebar-accent text-xs font-medium uppercase">
              {email?.[0] ?? "?"}
            </div>
            <div className="min-w-0 flex-1 text-xs text-muted-foreground truncate" title={email ?? undefined}>
              {email}
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground" onClick={handleSignOut} aria-label="Sign out" title="Sign out">
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top nav */}
        <header className="md:hidden h-14 border-b border-border flex items-center px-4 gap-2.5 bg-sidebar">
          <BrandMark size="sm" />
          <span className="text-sm font-semibold tracking-tight">Majestic</span>
          <Button variant="ghost" size="sm" className="ml-auto gap-1.5 h-8 text-muted-foreground" onClick={handleSignOut}>
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </Button>
        </header>
        <nav className="md:hidden flex overflow-x-auto gap-1 px-3 py-2 border-b border-border bg-sidebar">
          {[...nav, ...taxNav].map((item) => (
            <Link
              key={item.to}
              to={item.to as never}
              className={
                "shrink-0 rounded-md px-3 py-1.5 text-xs transition-colors " +
                (isActive(item, pathname) ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "text-muted-foreground")
              }
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <main className="flex-1 min-w-0 overflow-x-hidden">
          <div className="mx-auto max-w-7xl px-4 md:px-8 py-6 md:py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
