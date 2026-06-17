import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Search, FileDown } from "lucide-react";
import { useAppState, timesheetActions } from "@/lib/store";
import { TimesheetTable } from "@/components/timesheet-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { fromLocalInput, toLocalInput } from "@/lib/format";
import { resolveRate } from "@/lib/store";
import { generateInvoicePdf } from "@/lib/invoice";
import { toast } from "sonner";

export const Route = createFileRoute("/timesheets")({
  head: () => ({ meta: [{ title: "Timesheets · Majestic" }] }),
  component: TimesheetsPage,
});

function TimesheetsPage() {
  const { timesheets, customers, projects, activities } = useAppState();
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
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Timesheets</h1>
          <p className="text-sm text-muted-foreground mt-1">Browse, filter, and back-log time.</p>
        </div>
        <div className="flex items-center gap-2">
          <InvoiceDialog />
          <AddEntryDialog />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 grid grid-cols-1 md:grid-cols-6 gap-3">
        <div className="md:col-span-2">
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
        <div className="md:col-start-2">
          <Label className="text-xs text-muted-foreground mb-1.5 block">To</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="bg-background" />
        </div>
      </div>

      <div className="text-sm text-muted-foreground">{filtered.length} entries</div>
      <TimesheetTable entries={filtered} empty="No entries match your filters." />
    </div>
  );

  void activities;
}

function AddEntryDialog() {
  const { customers, projects, activities } = useAppState();
  const [open, setOpen] = useState(false);
  const [desc, setDesc] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [activityId, setActivityId] = useState("");
  const [billable, setBillable] = useState(true);
  const [start, setStart] = useState(toLocalInput(Date.now() - 3600000));
  const [end, setEnd] = useState(toLocalInput(Date.now()));

  const filteredProjects = projects.filter((p) => p.customerId === customerId);
  const filteredActivities = activities.filter((a) => a.projectId === null || a.projectId === projectId);

  function submit() {
    if (!customerId || !projectId || !activityId) { toast.error("Select customer, project, activity."); return; }
    const s = fromLocalInput(start);
    const e = fromLocalInput(end);
    if (e <= s) { toast.error("End must be after start."); return; }
    const rate = resolveRate({ customerId, activityId });
    timesheetActions.create({
      projectId, activityId, description: desc,
      startTime: s, endTime: e, duration: Math.round((e - s) / 1000),
      hourlyRate: rate, billable,
    });
    toast.success("Entry added");
    setOpen(false);
    setDesc(""); setCustomerId(""); setProjectId(""); setActivityId("");
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
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Customer</Label>
              <Select value={customerId} onValueChange={(v) => { setCustomerId(v); setProjectId(""); setActivityId(""); }}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Project</Label>
              <Select value={projectId} onValueChange={(v) => { setProjectId(v); setActivityId(""); }} disabled={!customerId}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{filteredProjects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Activity</Label>
              <Select value={activityId} onValueChange={setActivityId} disabled={!projectId}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{filteredActivities.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Start</Label>
              <Input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">End</Label>
              <Input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} />
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
  const { customers, projects, activities, timesheets } = useAppState();
  const [open, setOpen] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [invoiceNumber, setInvoiceNumber] = useState(`INV-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`);
  const [fromName, setFromName] = useState("Your Company");
  const [fromEmail, setFromEmail] = useState("");
  const [fromAddress, setFromAddress] = useState("");
  const [dueInDays, setDueInDays] = useState(14);
  const [notes, setNotes] = useState("Thank you for your business.");
  const [includeNonBillable, setIncludeNonBillable] = useState(false);

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

  function exportPdf() {
    if (!customer) { toast.error("Choose a customer."); return; }
    if (matchingEntries.length === 0) { toast.error("No entries in this date range."); return; }
    const doc = generateInvoicePdf({
      customer,
      entries: matchingEntries,
      projects,
      activities,
      invoiceNumber,
      dueInDays,
      from: { name: fromName, email: fromEmail || undefined, address: fromAddress || undefined },
      notes: notes || undefined,
    });
    doc.save(`${invoiceNumber}-${customer.name.replace(/\s+/g, "_")}.pdf`);
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
              ? `${matchingEntries.length} billable ${matchingEntries.length === 1 ? "entry" : "entries"} found for ${customer.company || customer.name} in the selected range.`
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
            <Label htmlFor="inc-nonbillable" className="text-sm">Include non-billable entries</Label>
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
          <Button onClick={exportPdf} disabled={!customer || matchingEntries.length === 0} className="gap-2">
            <FileDown className="h-4 w-4" /> Download PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

