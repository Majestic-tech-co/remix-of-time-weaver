import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { FileDown, FileBarChart, Building2, Wallet } from "lucide-react";
import { useAppState } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatMoney } from "@/lib/format";
import {
  generateYearEndCustomerReport,
  generateAnnualExpenseReport,
  generateAllCustomersReport,
} from "@/lib/tax-reports";
import { customerTaxRates } from "@/lib/store";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/tax/reports")({
  head: () => ({ meta: [{ title: "Tax reports · Majestic" }] }),
  component: TaxReportsPage,
});

function TaxReportsPage() {
  const { customers, projects, timesheets, expenses, taxSettings } = useAppState();
  const currentYear = new Date().getFullYear();

  const years = useMemo(() => {
    const set = new Set<number>([currentYear, currentYear - 1]);
    timesheets.forEach((t) => set.add(new Date(t.startTime).getFullYear()));
    expenses.forEach((e) => set.add(new Date(e.date).getFullYear()));
    return Array.from(set).sort((a, b) => b - a);
  }, [timesheets, expenses, currentYear]);

  const [year, setYear] = useState<number>(currentYear);
  const [customerId, setCustomerId] = useState<string>("");

  // Yearly figures
  const summary = useMemo(() => {
    const start = new Date(year, 0, 1).getTime();
    const end = new Date(year + 1, 0, 1).getTime();
    const yearEntries = timesheets.filter((t) => t.startTime >= start && t.startTime < end && t.billable);
    const services = yearEntries.reduce((s, e) => s + (e.duration / 3600) * e.hourlyRate, 0);
    let gst = 0, pst = 0;
    for (const c of customers) {
      const custProjectIds = new Set(projects.filter((p) => p.customerId === c.id).map((p) => p.id));
      const cEntries = yearEntries.filter((t) => custProjectIds.has(t.projectId));
      const cServices = cEntries.reduce((s, e) => s + (e.duration / 3600) * e.hourlyRate, 0);
      const { gst: gr, pst: pr } = customerTaxRates(c, taxSettings);
      gst += cServices * gr;
      pst += cServices * pr;
    }
    const yearExp = expenses.filter((e) => {
      const t = new Date(e.date).getTime();
      return t >= start && t < end;
    });
    const expTotal = yearExp.reduce((s, e) => s + e.total, 0);
    const expGstItc = yearExp.reduce((s, e) => s + e.gst, 0);
    const totalHours = yearEntries.reduce((s, e) => s + e.duration / 3600, 0);
    return { services, gst, pst, expTotal, expGstItc, totalHours, invoiced: services + gst + pst };
  }, [year, timesheets, expenses, customers, projects, taxSettings]);

  const currency = customers[0]?.currency || "CAD";

  function downloadCustomer() {
    const customer = customers.find((c) => c.id === customerId);
    if (!customer) { toast.error("Choose a customer."); return; }
    const doc = generateYearEndCustomerReport({ customer, year, timesheets, expenses, projects, settings: taxSettings });
    doc.save(`${year}-year-end-${(customer.company || customer.name).replace(/\s+/g, "_")}.pdf`);
    toast.success("Year-end statement downloaded");
  }

  function downloadAllCustomers() {
    const doc = generateAllCustomersReport({ year, customers, projects, timesheets, expenses, settings: taxSettings });
    doc.save(`${year}-income-summary.pdf`);
    toast.success("Income summary downloaded");
  }

  function downloadExpenses() {
    const doc = generateAnnualExpenseReport({ year, expenses, settings: taxSettings, currency });
    doc.save(`${year}-expense-summary.pdf`);
    toast.success("Expense summary downloaded");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Tax reports</h1>
          <p className="text-sm text-muted-foreground mt-1">Year-end statements, expense summaries, and income reports.</p>
        </div>
        <div className="w-40">
          <Label className="text-xs text-muted-foreground mb-1.5 block">Tax year</Label>
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Billable hours" value={summary.totalHours.toFixed(2)} />
        <StatCard label="Services income" value={formatMoney(summary.services, currency)} />
        <StatCard label="Total invoiced" value={formatMoney(summary.invoiced, currency)} highlight />
        <StatCard label="Expenses (with GST ITC)" value={formatMoney(summary.expTotal, currency)} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="GST/HST collected" value={formatMoney(summary.gst, currency)} />
        <StatCard label="PST collected" value={formatMoney(summary.pst, currency)} />
        <StatCard label="GST ITC (paid)" value={formatMoney(summary.expGstItc, currency)} />
        <StatCard label="Net GST owed" value={formatMoney(summary.gst - summary.expGstItc, currency)} />
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <ReportCard
          icon={<Building2 className="h-5 w-5" />}
          title="Year-end statement — one customer"
          description="A summary of hours, invoiced income, taxes collected and reimbursed expenses for a single customer. Great to send at year-end for their records."
        >
          <Label className="text-xs text-muted-foreground mb-1.5 block">Customer</Label>
          <Select value={customerId} onValueChange={setCustomerId}>
            <SelectTrigger><SelectValue placeholder="Select a customer..." /></SelectTrigger>
            <SelectContent>
              {customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.company || c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button className="w-full gap-2 mt-3" onClick={downloadCustomer} disabled={!customerId}>
            <FileDown className="h-4 w-4" /> Download PDF
          </Button>
        </ReportCard>

        <ReportCard
          icon={<FileBarChart className="h-5 w-5" />}
          title="Income summary — all customers"
          description="One page showing every customer's total hours and invoiced income for the year. Perfect for filing self-employed business income (T2125)."
        >
          <Button className="w-full gap-2 mt-3" onClick={downloadAllCustomers}>
            <FileDown className="h-4 w-4" /> Download PDF
          </Button>
        </ReportCard>

        <ReportCard
          icon={<Wallet className="h-5 w-5" />}
          title="Expense summary"
          description="All deductible expenses grouped by category with GST/HST input tax credits totalled. Attach with your return."
        >
          <Button className="w-full gap-2 mt-3" onClick={downloadExpenses}>
            <FileDown className="h-4 w-4" /> Download PDF
          </Button>
        </ReportCard>
      </div>
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

function ReportCard({ icon, title, description, children }: { icon: React.ReactNode; title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 flex flex-col">
      <div className="flex items-center gap-2 text-primary mb-2">{icon}<span className="text-sm font-semibold">{title}</span></div>
      <p className="text-sm text-muted-foreground flex-1">{description}</p>
      <div className="mt-4">{children}</div>
    </div>
  );
}
