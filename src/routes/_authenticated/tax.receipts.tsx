import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Paperclip, ExternalLink, Search } from "lucide-react";
import { useAppState, expenseActions, customerTaxRates } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatMoney, formatDate } from "@/lib/format";
import { EXPENSE_CATEGORIES, type Expense } from "@/lib/types";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/tax/receipts")({
  head: () => ({ meta: [{ title: "Receipts · Majestic" }] }),
  component: ReceiptsPage,
});

function ReceiptsPage() {
  const { expenses, customers, projects, taxSettings } = useAppState();
  const [editing, setEditing] = useState<Expense | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [year, setYear] = useState<string>("all");

  const years = useMemo(() => {
    const s = new Set<string>();
    expenses.forEach((e) => s.add(e.date.slice(0, 4)));
    return Array.from(s).sort((a, b) => b.localeCompare(a));
  }, [expenses]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return expenses.filter((e) => {
      if (year !== "all" && !e.date.startsWith(year)) return false;
      if (!q) return true;
      return (
        e.vendor.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        e.notes.toLowerCase().includes(q)
      );
    });
  }, [expenses, query, year]);

  const totals = useMemo(() => {
    return filtered.reduce(
      (acc, e) => ({ subtotal: acc.subtotal + e.subtotal, gst: acc.gst + e.gst, pst: acc.pst + e.pst, total: acc.total + e.total }),
      { subtotal: 0, gst: 0, pst: 0, total: 0 },
    );
  }, [filtered]);

  async function viewReceipt(path: string) {
    const url = await expenseActions.signedUrl(path);
    if (url) window.open(url, "_blank", "noopener");
  }

  function openNew() { setEditing(null); setOpen(true); }
  function openEdit(e: Expense) { setEditing(e); setOpen(true); }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Receipts</h1>
          <p className="text-sm text-muted-foreground mt-1">Deductible business expenses with attached receipts.</p>
        </div>
        <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> Add receipt</Button>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search vendor, category, notes..." value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="w-40">
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All years</SelectItem>
              {years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Subtotal" value={formatMoney(totals.subtotal, "CAD")} />
        <StatCard label="GST/HST paid" value={formatMoney(totals.gst, "CAD")} />
        <StatCard label="PST paid" value={formatMoney(totals.pst, "CAD")} />
        <StatCard label="Total" value={formatMoney(totals.total, "CAD")} highlight />
      </div>

      <div className="rounded-xl border border-border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium">Date</th>
              <th className="px-4 py-2.5 text-left font-medium">Vendor</th>
              <th className="px-4 py-2.5 text-left font-medium">Category</th>
              <th className="px-4 py-2.5 text-left font-medium">Customer</th>
              <th className="px-4 py-2.5 text-right font-medium">Subtotal</th>
              <th className="px-4 py-2.5 text-right font-medium">GST</th>
              <th className="px-4 py-2.5 text-right font-medium">PST</th>
              <th className="px-4 py-2.5 text-right font-medium">Total</th>
              <th className="px-4 py-2.5 text-center font-medium">Status</th>
              <th className="px-4 py-2.5 text-right font-medium w-28">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={10} className="px-4 py-10 text-center text-muted-foreground">No receipts yet.</td></tr>
            )}
            {filtered.map((e) => {
              const c = customers.find((x) => x.id === e.customerId);
              return (
                <tr key={e.id} className="border-t border-border hover:bg-muted/20">
                  <td className="px-4 py-2.5">{formatDate(new Date(e.date).getTime())}</td>
                  <td className="px-4 py-2.5 font-medium">{e.vendor}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{e.category}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{c ? (c.company || c.name) : "—"}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{formatMoney(e.subtotal, e.currency)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{formatMoney(e.gst, e.currency)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{formatMoney(e.pst, e.currency)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-medium">{formatMoney(e.total, e.currency)}</td>
                  <td className="px-4 py-2.5 text-center">
                    <div className="inline-flex gap-1 items-center">
                      {e.billableToCustomer && (
                        <Badge variant="outline" className={e.invoiced ? "border-emerald-700 text-emerald-500" : "border-amber-700 text-amber-500"}>
                          {e.invoiced ? "Invoiced" : "Reimbursable"}
                        </Badge>
                      )}
                      {e.receiptPath && (
                        <button onClick={() => viewReceipt(e.receiptPath!)} className="text-muted-foreground hover:text-foreground" title="View receipt">
                          <Paperclip className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="inline-flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(e)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={async () => { if (confirm("Delete receipt?")) await expenseActions.remove(e.id); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ExpenseDialog
        open={open}
        onOpenChange={setOpen}
        editing={editing}
        onDone={() => setOpen(false)}
        defaultCurrency={customers[0]?.currency || "CAD"}
        defaultGst={taxSettings.defaultGstRate}
        defaultPst={taxSettings.defaultPstRate}
      />
    </div>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={"rounded-xl border border-border p-4 " + (highlight ? "bg-primary/10" : "bg-card")}>
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold mt-1 tabular-nums">{value}</div>
    </div>
  );
}

function ExpenseDialog({
  open, onOpenChange, editing, onDone, defaultCurrency, defaultGst, defaultPst,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: Expense | null;
  onDone: () => void;
  defaultCurrency: string;
  defaultGst: number;
  defaultPst: number;
}) {
  const { customers, projects } = useAppState();
  const [date, setDate] = useState("");
  const [vendor, setVendor] = useState("");
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [subtotal, setSubtotal] = useState("0");
  const [gst, setGst] = useState("0");
  const [pst, setPst] = useState("0");
  const [currency, setCurrency] = useState(defaultCurrency);
  const [customerId, setCustomerId] = useState<string>("none");
  const [projectId, setProjectId] = useState<string>("none");
  const [notes, setNotes] = useState("");
  const [billable, setBillable] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [existingReceipt, setExistingReceipt] = useState<string | null>(null);

  const customerProjects = projects.filter((p) => p.customerId === (customerId === "none" ? "" : customerId));

  // Reset when opened
  useMemo(() => {
    if (!open) return;
    if (editing) {
      setDate(editing.date);
      setVendor(editing.vendor);
      setCategory(editing.category);
      setSubtotal(String(editing.subtotal));
      setGst(String(editing.gst));
      setPst(String(editing.pst));
      setCurrency(editing.currency);
      setCustomerId(editing.customerId ?? "none");
      setProjectId(editing.projectId ?? "none");
      setNotes(editing.notes);
      setBillable(editing.billableToCustomer);
      setExistingReceipt(editing.receiptPath);
      setFile(null);
    } else {
      setDate(new Date().toISOString().slice(0, 10));
      setVendor("");
      setCategory(EXPENSE_CATEGORIES[0]);
      setSubtotal("0"); setGst("0"); setPst("0");
      setCurrency(defaultCurrency);
      setCustomerId("none"); setProjectId("none");
      setNotes(""); setBillable(false); setExistingReceipt(null); setFile(null);
    }
  }, [open, editing, defaultCurrency]);

  function autoTax() {
    const s = Number(subtotal) || 0;
    setGst((s * defaultGst).toFixed(2));
    setPst((s * defaultPst).toFixed(2));
  }

  async function save() {
    if (!vendor.trim()) { toast.error("Vendor required."); return; }
    setSaving(true);
    const sub = Number(subtotal) || 0;
    const g = Number(gst) || 0;
    const p = Number(pst) || 0;
    let receiptPath = existingReceipt;
    if (file) {
      receiptPath = await expenseActions.uploadReceipt(file);
    }
    const payload = {
      date, vendor: vendor.trim(), category,
      subtotal: sub, gst: g, pst: p, total: sub + g + p,
      currency,
      customerId: customerId === "none" ? null : customerId,
      projectId: projectId === "none" ? null : projectId,
      notes, receiptPath: receiptPath ?? null,
      billableToCustomer: billable,
      invoiced: editing?.invoiced ?? false,
    };
    if (editing) await expenseActions.update(editing.id, payload);
    else await expenseActions.create(payload);
    setSaving(false);
    toast.success(editing ? "Receipt updated" : "Receipt added");
    onDone();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit receipt" : "Add receipt"}</DialogTitle>
          <DialogDescription>Track a business expense. Attach the receipt for your records.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid md:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs text-muted-foreground mb-1.5 block">Vendor</Label>
              <Input value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="e.g. Staples" />
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Currency</Label>
              <Input value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} maxLength={3} />
            </div>
          </div>
          <div className="grid grid-cols-4 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Subtotal</Label>
              <Input type="number" step="0.01" value={subtotal} onChange={(e) => setSubtotal(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">GST</Label>
              <Input type="number" step="0.01" value={gst} onChange={(e) => setGst(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">PST</Label>
              <Input type="number" step="0.01" value={pst} onChange={(e) => setPst(e.target.value)} />
            </div>
            <div className="flex items-end">
              <Button variant="outline" size="sm" onClick={autoTax} className="w-full">Auto-tax</Button>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            Total: <span className="tabular-nums font-medium text-foreground">{formatMoney((Number(subtotal) || 0) + (Number(gst) || 0) + (Number(pst) || 0), currency)}</span>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Customer (optional)</Label>
              <Select value={customerId} onValueChange={(v) => { setCustomerId(v); setProjectId("none"); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.company || c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Project (optional)</Label>
              <Select value={projectId} onValueChange={setProjectId} disabled={customerId === "none"}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {customerProjects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="billable-r" checked={billable} onCheckedChange={setBillable} disabled={customerId === "none"} />
            <Label htmlFor="billable-r" className="text-sm">Bill this back to the customer (reimbursable)</Label>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Notes</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Receipt file (PDF or image)</Label>
            <Input type="file" accept="image/*,application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            {existingReceipt && !file && (
              <button
                className="text-xs text-primary hover:underline mt-1.5 inline-flex items-center gap-1"
                onClick={async () => { const u = await expenseActions.signedUrl(existingReceipt); if (u) window.open(u, "_blank", "noopener"); }}
              >
                <ExternalLink className="h-3 w-3" /> View current receipt
              </button>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Saving..." : (editing ? "Save changes" : "Add receipt")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
