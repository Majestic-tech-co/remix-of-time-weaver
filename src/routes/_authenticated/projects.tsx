import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useAppState, projectActions } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/page-header";
import { StatusDot } from "@/components/status-dot";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatMoney, formatHours } from "@/lib/format";
import type { Project } from "@/lib/types";
import { ProjectsTabs } from "@/components/projects-tabs";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/projects")({
  head: () => ({ meta: [{ title: "Projects · Majestic" }] }),
  component: ProjectsPage,
});

function ProjectsPage() {
  const { projects, customers, timesheets } = useAppState();
  const [editing, setEditing] = useState<Project | null>(null);
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects"
        description="Work streams linked to customers, with budget tracking."
        actions={<>
          <ProjectsTabs active="/projects" />
          <Button onClick={() => { setEditing(null); setOpen(true); }} className="gap-2"><Plus className="h-4 w-4" /> Add project</Button>
        </>}
      />

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
                  <div className="font-semibold truncate">{p.name}</div>
                  <div className="text-xs text-muted-foreground truncate mt-0.5">{customer?.name ?? "—"}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusDot active={p.active} label={p.active ? "Active" : "Archived"} />
                  <div className="flex items-center text-muted-foreground -mr-2">
                    <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Edit project" onClick={() => { setEditing(p); setOpen(true); }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 hover:text-destructive" aria-label="Delete project" onClick={() => {
                      if (entries.length > 0) { toast.error("Delete entries first."); return; }
                      projectActions.remove(p.id);
                    }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
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
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={"h-full rounded-full transition-all " + (over ? "bg-destructive" : pct > 80 ? "bg-warning" : "bg-primary")}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                )}
                <div className="grid grid-cols-3 gap-3 pt-3 mt-1 border-t border-border/60">
                  <Stat label="Logged" value={formatHours(loggedSeconds)} />
                  <Stat label="Entries" value={String(entries.length)} />
                  <Stat label="Earnings" value={formatMoney(earnings, customer?.currency)} />
                </div>
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
    <div className="min-w-0">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="text-sm font-medium tabular-nums truncate mt-0.5">{value}</div>
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
