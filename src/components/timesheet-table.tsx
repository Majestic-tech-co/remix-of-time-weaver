import { useState } from "react";
import { Pencil, Trash2, Check, X } from "lucide-react";
import { useAppState, timesheetActions } from "@/lib/store";
import { formatDuration, formatMoney, formatDate, formatTime, toLocalInput, fromLocalInput } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Timesheet } from "@/lib/types";

export function TimesheetRow({ entry }: { entry: Timesheet }) {
  const { projects, customers } = useAppState();
  const project = projects.find((p) => p.id === entry.projectId);
  const customer = project ? customers.find((c) => c.id === project.customerId) : undefined;
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
        <td className="px-4 py-2"><Input value={desc} onChange={(e) => setDesc(e.target.value)} className="h-8" /></td>
        <td className="px-4 py-2 text-sm">
          <div className="text-xs text-muted-foreground">{customer?.name}</div>
          <div>{project?.name}</div>
        </td>
        <td className="px-4 py-2">
          <div className="flex flex-col gap-1.5 min-w-[190px]">
            <Input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} className="h-8 text-xs" />
            <Input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} className="h-8 text-xs" />
          </div>
        </td>
        <td className="px-4 py-2 text-right clock text-sm">{formatDuration(entry.duration)}</td>
        <td className="px-4 py-2 text-right tabular-nums">{formatMoney(earnings, customer?.currency)}</td>
        <td className="px-4 py-2 text-right">
          <div className="inline-flex gap-0.5">
            <Button size="icon" variant="ghost" onClick={save} className="h-7 w-7" aria-label="Save"><Check className="h-3.5 w-3.5" /></Button>
            <Button size="icon" variant="ghost" onClick={() => setEditing(false)} className="h-7 w-7" aria-label="Cancel"><X className="h-3.5 w-3.5" /></Button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="group border-b border-border/60 last:border-0 hover:bg-accent/20 transition-colors">
      <td className="px-4 py-3">
        <div className="font-medium truncate max-w-[280px]">{entry.description || <span className="text-muted-foreground">No description</span>}</div>
      </td>
      <td className="px-4 py-3">
        <div className="truncate max-w-[220px]">{project?.name ?? "—"}</div>
        <div className="text-xs text-muted-foreground truncate max-w-[220px]">{customer?.name ?? "—"}</div>
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <div>{formatDate(entry.startTime)}</div>
        <div className="text-xs text-muted-foreground tabular-nums">{formatTime(entry.startTime)} – {formatTime(entry.endTime)}</div>
      </td>
      <td className="px-4 py-3 text-right clock whitespace-nowrap">{formatDuration(entry.duration)}</td>
      <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap">
        {entry.billable
          ? formatMoney(earnings, customer?.currency)
          : <span className="text-xs text-muted-foreground">Non-billable</span>}
      </td>
      <td className="px-4 py-3 text-right">
        <div className="inline-flex gap-0.5 text-muted-foreground">
          <Button size="icon" variant="ghost" onClick={() => setEditing(true)} className="h-7 w-7" aria-label="Edit entry"><Pencil className="h-3.5 w-3.5" /></Button>
          <Button size="icon" variant="ghost" onClick={() => timesheetActions.remove(entry.id)} className="h-7 w-7 hover:text-destructive" aria-label="Delete entry"><Trash2 className="h-3.5 w-3.5" /></Button>
        </div>
      </td>
    </tr>
  );
}

export function TimesheetTable({ entries, empty }: { entries: Timesheet[]; empty?: string }) {
  if (entries.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
        {empty ?? "No entries yet. Start the timer above to log your first one."}
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="relative overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead className="border-b border-border text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium">Description</th>
              <th className="px-4 py-2.5 text-left font-medium">Project</th>
              <th className="px-4 py-2.5 text-left font-medium">Date</th>
              <th className="px-4 py-2.5 text-right font-medium">Duration</th>
              <th className="px-4 py-2.5 text-right font-medium">Earnings</th>
              <th className="px-4 py-2.5 w-20"><span className="sr-only">Actions</span></th>
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
