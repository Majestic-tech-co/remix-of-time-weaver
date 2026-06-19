import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useAppState, customerActions } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { formatMoney } from "@/lib/format";
import type { Customer } from "@/lib/types";
import { toast } from "sonner";

export const Route = createFileRoute("/customers")({
  head: () => ({ meta: [{ title: "Customers · Majestic" }] }),
  component: CustomersPage,
});

function CustomersPage() {
  const { customers, projects, timesheets } = useAppState();
  const [editing, setEditing] = useState<Customer | null>(null);
  const [open, setOpen] = useState(false);

  function openNew() { setEditing(null); setOpen(true); }
  function openEdit(c: Customer) { setEditing(c); setOpen(true); }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Customers</h1>
          <p className="text-sm text-muted-foreground mt-1">Clients you bill time against.</p>
        </div>
        <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> Add customer</Button>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium">Name</th>
              <th className="px-4 py-2.5 text-left font-medium">Company</th>
              <th className="px-4 py-2.5 text-right font-medium">Hourly rate</th>
              <th className="px-4 py-2.5 text-right font-medium">Projects</th>
              <th className="px-4 py-2.5 text-center font-medium">Status</th>
              <th className="px-4 py-2.5 text-right font-medium w-24">Actions</th>
            </tr>
          </thead>
          <tbody>
            {customers.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">No customers yet.</td></tr>
            )}
            {customers.map((c) => {
              const projCount = projects.filter((p) => p.customerId === c.id).length;
              return (
                <tr key={c.id} className="border-b border-border/60 hover:bg-accent/30">
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.company}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatMoney(c.hourlyRate, c.currency)}/h</td>
                  <td className="px-4 py-3 text-right tabular-nums">{projCount}</td>
                  <td className="px-4 py-3 text-center">
                    {c.active
                      ? <Badge className="bg-success/15 text-success border border-success/30 hover:bg-success/20">Active</Badge>
                      : <Badge variant="secondary">Inactive</Badge>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => {
                        if (projects.some((p) => p.customerId === c.id) || timesheets.some((t) => projects.find((p) => p.id === t.projectId)?.customerId === c.id)) {
                          toast.error("Delete projects & entries first."); return;
                        }
                        customerActions.remove(c.id);
                      }}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <CustomerDialog open={open} onOpenChange={setOpen} editing={editing} />
    </div>
  );
}

function CustomerDialog({ open, onOpenChange, editing }: { open: boolean; onOpenChange: (v: boolean) => void; editing: Customer | null }) {
  const [name, setName] = useState(editing?.name ?? "");
  const [company, setCompany] = useState(editing?.company ?? "");
  const [currency, setCurrency] = useState(editing?.currency ?? "USD");
  const [rate, setRate] = useState(String(editing?.hourlyRate ?? 100));
  const [active, setActive] = useState(editing?.active ?? true);

  // reset when dialog reopens
  useStateReset([editing, open], () => {
    setName(editing?.name ?? ""); setCompany(editing?.company ?? "");
    setCurrency(editing?.currency ?? "USD"); setRate(String(editing?.hourlyRate ?? 100));
    setActive(editing?.active ?? true);
  });

  function submit() {
    if (!name.trim()) { toast.error("Name required"); return; }
    const data = { name: name.trim(), company: company.trim(), currency, hourlyRate: parseFloat(rate) || 0, active };
    if (editing) customerActions.update(editing.id, data);
    else customerActions.create(data);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{editing ? "Edit" : "New"} customer</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label className="mb-1.5 block text-xs text-muted-foreground">Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><Label className="mb-1.5 block text-xs text-muted-foreground">Company</Label><Input value={company} onChange={(e) => setCompany(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="mb-1.5 block text-xs text-muted-foreground">Currency</Label><Input value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} maxLength={3} /></div>
            <div><Label className="mb-1.5 block text-xs text-muted-foreground">Hourly rate</Label><Input type="number" value={rate} onChange={(e) => setRate(e.target.value)} /></div>
          </div>
          <div className="flex items-center gap-2"><Switch id="cact" checked={active} onCheckedChange={setActive} /><Label htmlFor="cact">Active</Label></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit}>{editing ? "Save" : "Create"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// helper to reset state when deps change
import { useEffect } from "react";
function useStateReset(deps: unknown[], fn: () => void) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(fn, deps);
}
