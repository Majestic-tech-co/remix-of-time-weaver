import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Search, FileDown } from "lucide-react";
import { useAppState, timesheetActions, expenseActions } from "@/lib/store";
import { TimesheetTable } from "@/components/timesheet-table";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { DateTimePicker } from "@/components/ui/datetime-picker";
import { fromLocalInput, toLocalInput } from "@/lib/format";
import { resolveRate } from "@/lib/store";
import { generateInvoicePdf } from "@/lib/invoice";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/timesheets")({
  head: () => ({ meta: [{ title: "Timesheets · Majestic" }] }),
  component: TimesheetsPage,
});

function TimesheetsPage() {
  const { timesheets, customers, projects } = useAppState();
  const [q, setQ] = useState("");
  const [customerFilter, setCustomerFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [billableFilter, setBillableFilter] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const filtered = useMemo(() => {
    return timesheets
      .filter((t) => {
        if (q && !t.description.toLowerCase().includes(q.toLowerCase())) return false;
        const project = projects.find((p) => p.id === t.projectId);
        if (customerFilter !== "all" && project?.customerId !== customerFilter) return false;
        if (projectFilter !== "all" && t.projectId !== projectFilter) return false;
        if (billableFilter === "billable" && !t.billable) return false;
        if (billableFilter === "non" && t.billable) return false;
        if (from && t.startTime < new Date(from).getTime()) return false;
        if (to && t.startTime > new Date(to).getTime() + 86400000) return false;
        return true;
      })
      .sort((a, b) => b.startTime - a.startTime);
  }, [timesheets, q, customerFilter, projectFilter, billableFilter, from, to, projects]);

  const projectsForFilter = customerFilter === "all" ? projects : projects.filter((p) => p.customerId === customerFilter);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Timesheets"
        description="Browse, filter, and back-log time."
        actions={<><InvoiceDialog /><AddEntryDialog /></>}
      />

      <div className="rounded-xl border border-border bg-card p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
        <div className="sm:col-span-2">
          <Label className="text-xs text-muted-foreground mb-1.5 block">Search</Label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Description..." className="pl-8 bg-background" />
          </div>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">Customer</Label>
          <Select value={customerFilter} onValueChange={(v) => { setCustomerFilter(v); setProjectFilter("all"); }}>
            <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All customers</SelectItem>
              {customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">Project</Label>
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All projects</SelectItem>
              {projectsForFilter.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">Billable</Label>
          <Select value={billableFilter} onValueChange={setBillableFilter}>
            <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="billable">Billable only</SelectItem>
              <SelectItem value="non">Non-billable</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">From</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="bg-background" />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">To</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="bg-background" />
        </div>
      </div>

      <div className="space-y-3">
        <div className="text-xs text-muted-foreground">{filtered.length} {filtered.length === 1 ? "entry" : "entries"}</div>
        <TimesheetTable entries={filtered} empty="No entries match your filters." />
      </div>
    </div>
  );
}

function AddEntryDialog() {
  const { customers, projects } = useAppState();
  const [open, setOpen] = useState(false);
  const [desc, setDesc] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [billable, setBillable] = useState(true);
  const [start, setStart] = useState(toLocalInput(Date.now() - 3600000));
  const [end, setEnd] = useState(toLocalInput(Date.now()));

  const filteredProjects = projects.filter((p) => p.customerId === customerId);

  function submit() {
    if (!customerId || !projectId) { toast.error("Select a customer and project."); return; }
    const s = fromLocalInput(start);
    const e = fromLocalInput(end);
    if (e <= s) { toast.error("End must be after start."); return; }
    const rate = resolveRate({ customerId });
    timesheetActions.create({
      projectId, description: desc,
      startTime: s, endTime: e, duration: Math.round((e - s) / 1000),
      hourlyRate: rate, billable,
    });
    toast.success("Entry added");
    setOpen(false);
    setDesc(""); setCustomerId(""); setProjectId("");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2"><Plus className="h-4 w-4" /> Add entry</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Back-log time entry</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Description</Label>
            <Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What did you do?" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Customer</Label>
              <Select value={customerId} onValueChange={(v) => { setCustomerId(v); setProjectId(""); }}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Project</Label>
              <Select value={projectId} onValueChange={setProjectId} disabled={!customerId}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{filteredProjects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Start</Label>
              <DateTimePicker value={start} onChange={setStart} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">End</Label>
              <DateTimePicker value={end} onChange={setEnd} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="add-billable" checked={billable} onCheckedChange={setBillable} />
            <Label htmlFor="add-billable">Billable</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit}>Save entry</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InvoiceDialog() {
  const { customers, projects, timesheets, expenses, taxSettings } = useAppState();
  const [open, setOpen] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [invoiceNumber, setInvoiceNumber] = useState(`INV-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`);
  const [fromName, setFromName] = useState(taxSettings.businessName || "Your Company");
  const [fromEmail, setFromEmail] = useState(taxSettings.businessEmail);
  const [fromAddress, setFromAddress] = useState(taxSettings.businessAddress);
  const [dueInDays, setDueInDays] = useState(14);
  const [notes, setNotes] = useState("Thank you for your business.");
  const [includeNonBillable, setIncludeNonBillable] = useState(false);
  const [includeExpenses, setIncludeExpenses] = useState(true);

  const customer = customers.find((c) => c.id === customerId);
  const fromTs = from ? new Date(from).getTime() : -Infinity;
  const toTs = to ? new Date(to).getTime() + 86_400_000 : Infinity;

  const matchingEntries = customer
    ? timesheets
        .filter((e) => {
          const p = projects.find((pr) => pr.id === e.projectId);
          if (p?.customerId !== customer.id) return false;
          if (!includeNonBillable && !e.billable) return false;
          if (e.startTime < fromTs || e.startTime > toTs) return false;
          return true;
        })
        .sort((a, b) => a.startTime - b.startTime)
    : [];

  const matchingExpenses = customer && includeExpenses
    ? expenses.filter((x) => {
        if (x.customerId !== customer.id) return false;
        if (!x.billableToCustomer || x.invoiced) return false;
        const ts = new Date(x.date).getTime();
        return ts >= fromTs && ts <= toTs;
      })
    : [];

  async function exportPdf() {
    if (!customer) { toast.error("Choose a customer."); return; }
    if (matchingEntries.length === 0 && matchingExpenses.length === 0) { toast.error("No entries or expenses in this date range."); return; }
    const doc = generateInvoicePdf({
      customer,
      entries: matchingEntries,
      expenses: matchingExpenses,
      projects,
      settings: taxSettings,
      invoiceNumber,
      dueInDays,
      from: { name: fromName, email: fromEmail || undefined, address: fromAddress || undefined },
      notes: notes || undefined,
    });
    doc.save(`${invoiceNumber}-${customer.name.replace(/\s+/g, "_")}.pdf`);
    // Mark reimbursed expenses as invoiced so they aren't double-billed
    await Promise.all(matchingExpenses.map((x) => expenseActions.update(x.id, { invoiced: true })));
    toast.success("Invoice downloaded");
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2"><FileDown className="h-4 w-4" /> Export invoice</Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Generate invoice PDF</DialogTitle>
          <DialogDescription>
            {customer
              ? `${matchingEntries.length} time ${matchingEntries.length === 1 ? "entry" : "entries"} and ${matchingExpenses.length} reimbursable ${matchingExpenses.length === 1 ? "expense" : "expenses"} for ${customer.company || customer.name}.`
              : "Pick a customer and the billing period."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Customer</Label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger><SelectValue placeholder="Select a customer..." /></SelectTrigger>
              <SelectContent>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.company || c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Billing from</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Billing to</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="inc-nonbillable" checked={includeNonBillable} onCheckedChange={setIncludeNonBillable} />
            <Label htmlFor="inc-nonbillable" className="text-sm">Include non-billable time</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="inc-expenses" checked={includeExpenses} onCheckedChange={setIncludeExpenses} />
            <Label htmlFor="inc-expenses" className="text-sm">Include reimbursable expenses (not yet invoiced)</Label>
          </div>
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Invoice number</Label>
              <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Due in (days)</Label>
              <Input type="number" min={0} value={dueInDays} onChange={(e) => setDueInDays(Number(e.target.value) || 0)} />
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Your name / company</Label>
            <Input value={fromName} onChange={(e) => setFromName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Your email</Label>
              <Input value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} placeholder="billing@..." />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Your address</Label>
              <Input value={fromAddress} onChange={(e) => setFromAddress(e.target.value)} placeholder="Optional" />
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={exportPdf} disabled={!customer || (matchingEntries.length === 0 && matchingExpenses.length === 0)} className="gap-2">
            <FileDown className="h-4 w-4" /> Download PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

