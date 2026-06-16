import { useState } from "react";
import { Pencil, Trash2, Check, X, DollarSign } from "lucide-react";
import { useAppState, timesheetActions } from "@/lib/store";
import { formatDuration, formatMoney, formatDateTime, toLocalInput, fromLocalInput } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { Timesheet } from "@/lib/types";

export function TimesheetRow({ entry }: { entry: Timesheet }) {
  const { projects, customers, activities } = useAppState();
  const project = projects.find((p) => p.id === entry.projectId);
  const customer = project ? customers.find((c) => c.id === project.customerId) : undefined;
  const activity = activities.find((a) => a.id === entry.activityId);
  const earnings = entry.billable ? (entry.duration / 3600) * entry.hourlyRate : 0;

  const [editing, setEditing] = useState(false);
  const [desc, setDesc] = useState(entry.description);
  const [start, setStart] = useState(toLocalInput(entry.startTime));
  const [end, setEnd] = useState(toLocalInput(entry.endTime));

  function save() {
    const s = fromLocalInput(start);
    const e = fromLocalInput(end);
    if (e <= s) return;
    timesheetActions.update(entry.id, { description: desc, startTime: s, endTime: e });
    setEditing(false);
  }

  if (editing) {
    return (
      <tr className="border-b border-border bg-accent/30">
        <td className="px-3 py-2"><Input value={desc} onChange={(e) => setDesc(e.target.value)} className="h-8" /></td>
        <td className="px-3 py-2 text-sm text-muted-foreground">{customer?.name}<br /><span className="text-foreground">{project?.name}</span></td>
        <td className="px-3 py-2 text-sm">{activity?.name}</td>
        <td className="px-3 py-2"><Input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} className="h-8 text-xs" /></td>
        <td className="px-3 py-2"><Input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} className="h-8 text-xs" /></td>
        <td className="px-3 py-2 text-right tabular-nums clock">{formatDuration(entry.duration)}</td>
        <td className="px-3 py-2 text-right tabular-nums">{formatMoney(earnings, customer?.currency)}</td>
        <td className="px-3 py-2 text-right">
          <div className="inline-flex gap-1">
            <Button size="icon" variant="ghost" onClick={save} className="h-7 w-7"><Check className="h-3.5 w-3.5" /></Button>
            <Button size="icon" variant="ghost" onClick={() => setEditing(false)} className="h-7 w-7"><X className="h-3.5 w-3.5" /></Button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-border/60 hover:bg-accent/30 transition-colors">
      <td className="px-3 py-2.5">
        <div className="font-medium text-sm truncate max-w-[280px]">{entry.description || <span className="text-muted-foreground italic">—</span>}</div>
      </td>
      <td className="px-3 py-2.5 text-sm">
        <div className="text-muted-foreground text-xs">{customer?.name ?? "—"}</div>
        <div>{project?.name ?? "—"}</div>
      </td>
      <td className="px-3 py-2.5 text-sm">{activity?.name ?? "—"}</td>
      <td className="px-3 py-2.5 text-xs text-muted-foreground tabular-nums">{formatDateTime(entry.startTime)}</td>
      <td className="px-3 py-2.5 text-xs text-muted-foreground tabular-nums">{formatDateTime(entry.endTime)}</td>
      <td className="px-3 py-2.5 text-right tabular-nums clock text-sm">{formatDuration(entry.duration)}</td>
      <td className="px-3 py-2.5 text-right">
        {entry.billable ? (
          <Badge className="bg-success/15 text-success border border-success/30 hover:bg-success/20 tabular-nums gap-1">
            <DollarSign className="h-3 w-3" />
            {formatMoney(earnings, customer?.currency)}
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground tabular-nums">{formatMoney(0, customer?.currency)}</span>
        )}
      </td>
      <td className="px-3 py-2.5 text-right">
        <div className="inline-flex gap-1">
          <Button size="icon" variant="ghost" onClick={() => setEditing(true)} className="h-7 w-7"><Pencil className="h-3.5 w-3.5" /></Button>
          <Button size="icon" variant="ghost" onClick={() => timesheetActions.remove(entry.id)} className="h-7 w-7 text-destructive hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
        </div>
      </td>
    </tr>
  );
}

export function TimesheetTable({ entries, empty }: { entries: Timesheet[]; empty?: string }) {
  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground bg-card/40">
        {empty ?? "No entries yet. Start the timer above to log your first one."}
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2.5 text-left font-medium">Description</th>
              <th className="px-3 py-2.5 text-left font-medium">Customer / Project</th>
              <th className="px-3 py-2.5 text-left font-medium">Activity</th>
              <th className="px-3 py-2.5 text-left font-medium">Start</th>
              <th className="px-3 py-2.5 text-left font-medium">End</th>
              <th className="px-3 py-2.5 text-right font-medium">Duration</th>
              <th className="px-3 py-2.5 text-right font-medium">Earnings</th>
              <th className="px-3 py-2.5 text-right font-medium w-20">Actions</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => <TimesheetRow key={e.id} entry={e} />)}
          </tbody>
        </table>
      </div>
    </div>
  );
}
