import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useAppState, projectActions } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatMoney, formatHours } from "@/lib/format";
import type { Project } from "@/lib/types";
import { toast } from "sonner";

export const Route = createFileRoute("/projects")({
  head: () => ({ meta: [{ title: "Projects · Tempo" }] }),
  component: ProjectsPage,
});

function ProjectsPage() {
  const { projects, customers, timesheets } = useAppState();
  const [editing, setEditing] = useState<Project | null>(null);
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground mt-1">Work streams linked to customers, with budget tracking.</p>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }} className="gap-2"><Plus className="h-4 w-4" /> Add project</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {projects.length === 0 && (
          <div className="md:col-span-2 xl:col-span-3 rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            No projects yet. Create one to start tracking budget vs actuals.
          </div>
        )}
        {projects.map((p) => {
          const customer = customers.find((c) => c.id === p.customerId);
          const entries = timesheets.filter((t) => t.projectId === p.id);
          const loggedSeconds = entries.reduce((s, e) => s + e.duration, 0);
          const loggedHours = loggedSeconds / 3600;
          const earnings = entries.reduce((s, e) => (e.billable ? s + (e.duration / 3600) * e.hourlyRate : s), 0);

          const isMoney = p.budgetType === "money";
          const isHours = p.budgetType === "hours";
          const budgetVal = isMoney ? earnings : loggedHours;
          const budgetMax = p.budget;
          const pct = budgetMax > 0 ? Math.min(100, (budgetVal / budgetMax) * 100) : 0;
          const over = budgetMax > 0 && budgetVal > budgetMax;

          return (
            <div key={p.id} className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground truncate">{customer?.name ?? "—"}</div>
                  <div className="font-semibold truncate">{p.name}</div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {p.active
                    ? <Badge className="bg-success/15 text-success border border-success/30 hover:bg-success/20">Active</Badge>
                    : <Badge variant="secondary">Archived</Badge>}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{p.budgetType === "none" ? "No budget set" : (isMoney ? "Budget · earnings" : "Budget · hours")}</span>
                  {p.budgetType !== "none" && (
                    <span className={"tabular-nums " + (over ? "text-destructive font-semibold" : "")}>
                      {isMoney ? formatMoney(budgetVal, customer?.currency) : formatHours(loggedSeconds)}
                      <span className="text-muted-foreground"> / {isMoney ? formatMoney(budgetMax, customer?.currency) : `${budgetMax}h`}</span>
                    </span>
                  )}
                </div>
                {p.budgetType !== "none" && (
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={"h-full rounded-full transition-all " + (over ? "bg-destructive" : pct > 80 ? "bg-warning" : "bg-primary")}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                )}
                <div className="grid grid-cols-3 gap-2 text-xs pt-1">
                  <Stat label="Logged" value={formatHours(loggedSeconds)} />
                  <Stat label="Entries" value={String(entries.length)} />
                  <Stat label="Earnings" value={formatMoney(earnings, customer?.currency)} />
                </div>
              </div>

              <div className="flex items-center gap-1 pt-2 border-t border-border/60 -mx-1">
                <Button size="sm" variant="ghost" className="gap-1.5" onClick={() => { setEditing(p); setOpen(true); }}>
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </Button>
                <Button size="sm" variant="ghost" className="gap-1.5 text-destructive hover:text-destructive ml-auto" onClick={() => {
                  if (entries.length > 0) { toast.error("Delete entries first."); return; }
                  projectActions.remove(p.id);
                }}>
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <ProjectDialog open={open} onOpenChange={setOpen} editing={editing} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted/40 px-2 py-1.5">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-medium tabular-nums truncate">{value}</div>
    </div>
  );
}

function ProjectDialog({ open, onOpenChange, editing }: { open: boolean; onOpenChange: (v: boolean) => void; editing: Project | null }) {
  const { customers } = useAppState();
  const [name, setName] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [budgetType, setBudgetType] = useState<"none" | "hours" | "money">("hours");
  const [budget, setBudget] = useState("40");
  const [active, setActive] = useState(true);

  useEffect(() => {
    setName(editing?.name ?? "");
    setCustomerId(editing?.customerId ?? "");
    setBudgetType(editing?.budgetType ?? "hours");
    setBudget(String(editing?.budget ?? 40));
    setActive(editing?.active ?? true);
  }, [editing, open]);

  function submit() {
    if (!name.trim() || !customerId) { toast.error("Name and customer required"); return; }
    const data = { name: name.trim(), customerId, budgetType, budget: parseFloat(budget) || 0, active };
    if (editing) projectActions.update(editing.id, data);
    else projectActions.create(data);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{editing ? "Edit" : "New"} project</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label className="mb-1.5 block text-xs text-muted-foreground">Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div>
            <Label className="mb-1.5 block text-xs text-muted-foreground">Customer</Label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>{customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">Budget type</Label>
              <Select value={budgetType} onValueChange={(v) => setBudgetType(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="hours">Hours</SelectItem>
                  <SelectItem value="money">Monetary</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">Budget</Label>
              <Input type="number" value={budget} onChange={(e) => setBudget(e.target.value)} disabled={budgetType === "none"} />
            </div>
          </div>
          <div className="flex items-center gap-2"><Switch id="pact" checked={active} onCheckedChange={setActive} /><Label htmlFor="pact">Active</Label></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit}>{editing ? "Save" : "Create"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
