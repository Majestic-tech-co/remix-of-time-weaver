import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useAppState, activityActions } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Activity } from "@/lib/types";
import { toast } from "sonner";
import { formatMoney } from "@/lib/format";

export const Route = createFileRoute("/activities")({
  head: () => ({ meta: [{ title: "Activities · Tempo" }] }),
  component: ActivitiesPage,
});

function ActivitiesPage() {
  const { activities, projects, timesheets } = useAppState();
  const [editing, setEditing] = useState<Activity | null>(null);
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Activities</h1>
          <p className="text-sm text-muted-foreground mt-1">Tasks attached to projects, or shared across all of them.</p>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }} className="gap-2"><Plus className="h-4 w-4" /> Add activity</Button>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium">Name</th>
              <th className="px-4 py-2.5 text-left font-medium">Scope</th>
              <th className="px-4 py-2.5 text-right font-medium">Custom rate</th>
              <th className="px-4 py-2.5 text-right font-medium">Entries</th>
              <th className="px-4 py-2.5 text-right font-medium w-24">Actions</th>
            </tr>
          </thead>
          <tbody>
            {activities.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">No activities yet.</td></tr>
            )}
            {activities.map((a) => {
              const project = a.projectId ? projects.find((p) => p.id === a.projectId) : null;
              const count = timesheets.filter((t) => t.activityId === a.id).length;
              return (
                <tr key={a.id} className="border-b border-border/60 hover:bg-accent/30">
                  <td className="px-4 py-3 font-medium">{a.name}</td>
                  <td className="px-4 py-3">
                    {project
                      ? <Badge variant="secondary">{project.name}</Badge>
                      : <Badge className="bg-primary/15 text-primary border border-primary/30 hover:bg-primary/20">Global</Badge>}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{a.hourlyRate != null ? `${formatMoney(a.hourlyRate)}/h` : <span className="text-muted-foreground">—</span>}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{count}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEditing(a); setOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => {
                        if (count > 0) { toast.error("Delete its entries first."); return; }
                        activityActions.remove(a.id);
                      }}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ActivityDialog open={open} onOpenChange={setOpen} editing={editing} />
    </div>
  );
}

function ActivityDialog({ open, onOpenChange, editing }: { open: boolean; onOpenChange: (v: boolean) => void; editing: Activity | null }) {
  const { projects } = useAppState();
  const [name, setName] = useState("");
  const [scope, setScope] = useState<"global" | string>("global");
  const [rate, setRate] = useState("");

  useEffect(() => {
    setName(editing?.name ?? "");
    setScope(editing?.projectId ?? "global");
    setRate(editing?.hourlyRate != null ? String(editing.hourlyRate) : "");
  }, [editing, open]);

  function submit() {
    if (!name.trim()) { toast.error("Name required"); return; }
    const data = {
      name: name.trim(),
      projectId: scope === "global" ? null : scope,
      hourlyRate: rate.trim() === "" ? null : parseFloat(rate),
    };
    if (editing) activityActions.update(editing.id, data);
    else activityActions.create(data);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{editing ? "Edit" : "New"} activity</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label className="mb-1.5 block text-xs text-muted-foreground">Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Development" /></div>
          <div>
            <Label className="mb-1.5 block text-xs text-muted-foreground">Scope</Label>
            <Select value={scope} onValueChange={setScope}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="global">Global (any project)</SelectItem>
                {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-1.5 block text-xs text-muted-foreground">Custom hourly rate (optional)</Label>
            <Input type="number" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="Leave blank to use customer rate" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit}>{editing ? "Save" : "Create"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
