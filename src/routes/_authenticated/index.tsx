import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { Clock, DollarSign, Briefcase } from "lucide-react";
import { useAppState } from "@/lib/store";
import { TimerBar } from "@/components/timer-bar";
import { TimesheetTable } from "@/components/timesheet-table";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { startOfWeek, formatDuration, formatMoney } from "@/lib/format";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from "recharts";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Dashboard · Majestic" },
      { name: "description", content: "Your weekly time tracking dashboard." },
    ],
  }),
  component: Dashboard,
});

const CHART_COLORS = ["oklch(0.78 0.16 75)", "oklch(0.70 0.16 195)", "oklch(0.70 0.16 155)", "oklch(0.70 0.18 320)", "oklch(0.72 0.17 30)"];

function Dashboard() {
  const { timesheets, projects, customers } = useAppState();
  const weekStart = useMemo(() => startOfWeek(new Date()).getTime(), []);
  const weekEntries = useMemo(
    () => timesheets.filter((t) => t.startTime >= weekStart).sort((a, b) => b.startTime - a.startTime),
    [timesheets, weekStart],
  );

  const totalSeconds = weekEntries.reduce((sum, t) => sum + t.duration, 0);
  const billableEarnings = weekEntries.reduce(
    (sum, t) => (t.billable ? sum + (t.duration / 3600) * t.hourlyRate : sum),
    0,
  );
  const activeProjectsCount = new Set(weekEntries.map((t) => t.projectId)).size;

  const byProject = useMemo(() => {
    const map = new Map<string, number>();
    weekEntries.forEach((t) => map.set(t.projectId, (map.get(t.projectId) ?? 0) + t.duration));
    return Array.from(map.entries())
      .map(([projectId, secs]) => {
        const p = projects.find((x) => x.id === projectId);
        return { name: p?.name ?? "Unknown", hours: +(secs / 3600).toFixed(2) };
      })
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 6);
  }, [weekEntries, projects]);

  const primaryCurrency = customers[0]?.currency ?? "USD";

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description="Track time, see what's billable, ship invoices." />

      <TimerBar />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard icon={Clock} label="Hours this week" value={formatDuration(totalSeconds)} sub={`${(totalSeconds / 3600).toFixed(2)} hours total`} />
        <StatCard icon={DollarSign} label="Billable earnings" value={formatMoney(billableEarnings, primaryCurrency)} sub="Week to date" />
        <StatCard icon={Briefcase} label="Active projects" value={String(activeProjectsCount)} sub="Worked on this week" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold">Hours by project · this week</h2>
            <span className="text-xs text-muted-foreground">Top 6</span>
          </div>
          {byProject.length === 0 ? (
            <div className="h-56 grid place-items-center text-sm text-muted-foreground">No data yet — start a timer.</div>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byProject} margin={{ left: -10, right: 8, top: 8, bottom: 8 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "currentColor" }} stroke="currentColor" strokeOpacity={0.25} tickLine={false} className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 11, fill: "currentColor" }} axisLine={false} tickLine={false} className="text-muted-foreground" />
                  <Tooltip
                    cursor={{ fill: "var(--accent)", fillOpacity: 0.4 }}
                    contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                    formatter={(v: number) => [`${v}h`, "Hours"]}
                  />
                  <Bar dataKey="hours" radius={[4, 4, 0, 0]} maxBarSize={56}>
                    {byProject.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold mb-4">Breakdown</h2>
          <ul className="space-y-3">
            {byProject.length === 0 && <li className="text-sm text-muted-foreground">No projects tracked yet.</li>}
            {byProject.map((b, i) => {
              const pct = totalSeconds > 0 ? (b.hours * 3600 / totalSeconds) * 100 : 0;
              return (
                <li key={b.name} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="truncate flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                      {b.name}
                    </span>
                    <span className="tabular-nums text-muted-foreground">{b.hours}h</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: CHART_COLORS[i % CHART_COLORS.length] }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">Recent entries · this week</h2>
          <span className="text-xs text-muted-foreground">{weekEntries.length} entries</span>
        </div>
        <TimesheetTable entries={weekEntries.slice(0, 12)} empty="No entries this week yet." />
      </div>
    </div>
  );
}
