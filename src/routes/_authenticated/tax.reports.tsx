import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { FileDown, FileBarChart, Building2, Wallet } from "lucide-react";
import { useAppState } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatTotals, addToTotals, type CurrencyTotals } from "@/lib/format";
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
    const services: CurrencyTotals = {}, gst: CurrencyTotals = {}, pst: CurrencyTotals = {}, invoiced: CurrencyTotals = {};
    for (const c of customers) {
      const custProjectIds = new Set(projects.filter((p) => p.customerId === c.id).map((p) => p.id));
      const cEntries = yearEntries.filter((t) => custProjectIds.has(t.projectId));
      const cServices = cEntries.reduce((s, e) => s + (e.duration / 3600) * e.hourlyRate, 0);
      const { gst: gr, pst: pr } = customerTaxRates(c, taxSettings);
      addToTotals(services, c.currency, cServices);
      addToTotals(gst, c.currency, cServices * gr);
      addToTotals(pst, c.currency, cServices * pr);
      addToTotals(invoiced, c.currency, cServices * (1 + gr + pr));
    }
    const yearExp = expenses.filter((e) => {
      const t = new Date(e.date).getTime();
      return t >= start && t < end;
    });
    const expTotal: CurrencyTotals = {}, expGstItc: CurrencyTotals = {}, netGst: CurrencyTotals = { ...gst };
    for (const e of yearExp) {
      addToTotals(expTotal, e.currency, e.total);
      addToTotals(expGstItc, e.currency, e.gst);
      addToTotals(netGst, e.currency, -e.gst);
    }
    const totalHours = yearEntries.reduce((s, e) => s + e.duration / 3600, 0);
    const currencies = new Set([...Object.keys(services), ...Object.keys(expTotal)].filter((c) => (services[c] ?? 0) !== 0 || (expTotal[c] ?? 0) !== 0));
    return { services, gst, pst, expTotal, expGstItc, netGst, totalHours, invoiced, mixedCurrencies: currencies.size > 1 };
  }, [year, timesheets, expenses, customers, projects, taxSettings]);


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
    const doc = generateAnnualExpenseReport({ year, expenses, settings: taxSettings });
    doc.save(`${year}-expense-summary.pdf`);
    toast.success("Expense summary downloaded");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tax reports"
        description="Year-end statements, expense summaries, and income reports."
        actions={
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-36" aria-label="Tax year"><span className="text-muted-foreground mr-1">Year</span><SelectValue /></SelectTrigger>
            <SelectContent>
              {years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        }
      />

      {summary.mixedCurrencies && (
        <p className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          This year includes more than one currency, so totals are shown per currency. Convert foreign amounts to CAD
          at the Bank of Canada rate before filing.
        </p>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Income &amp; expenses</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard size="sm" label="Billable hours" value={summary.totalHours.toFixed(2)} />
          <StatCard size="sm" label="Services income" value={formatTotals(summary.services)} />
          <StatCard size="sm" label="Total invoiced" value={formatTotals(summary.invoiced)} />
          <StatCard size="sm" label="Expenses (with GST ITC)" value={formatTotals(summary.expTotal)} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Sales tax</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard size="sm" label="GST/HST collected" value={formatTotals(summary.gst)} />
          <StatCard size="sm" label="PST collected" value={formatTotals(summary.pst)} />
          <StatCard size="sm" label="GST ITC (paid)" value={formatTotals(summary.expGstItc)} />
          <StatCard size="sm" label="Net GST owed" value={formatTotals(summary.netGst)} />
        </div>
      </section>

      <section className="space-y-3">
      <h2 className="text-sm font-semibold">Download reports</h2>
      <div className="grid md:grid-cols-3 gap-4">
        <ReportCard
          icon={<Building2 className="h-4 w-4" />}
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
          <Button variant="secondary" className="w-full gap-2 mt-3" onClick={downloadCustomer} disabled={!customerId}>
            <FileDown className="h-4 w-4" /> Download PDF
          </Button>
        </ReportCard>

        <ReportCard
          icon={<FileBarChart className="h-4 w-4" />}
          title="Income summary — all customers"
          description="One page showing every customer's total hours and invoiced income for the year. Perfect for filing self-employed business income (T2125)."
        >
          <Button variant="secondary" className="w-full gap-2 mt-3" onClick={downloadAllCustomers}>
            <FileDown className="h-4 w-4" /> Download PDF
          </Button>
        </ReportCard>

        <ReportCard
          icon={<Wallet className="h-4 w-4" />}
          title="Expense summary"
          description="All deductible expenses grouped by category with GST/HST input tax credits totalled. Attach with your return."
        >
          <Button variant="secondary" className="w-full gap-2 mt-3" onClick={downloadExpenses}>
            <FileDown className="h-4 w-4" /> Download PDF
          </Button>
        </ReportCard>
      </div>
      </section>
    </div>
  );
}

function ReportCard({ icon, title, description, children }: { icon: React.ReactNode; title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 flex flex-col">
      <div className="flex items-center gap-2.5 mb-2">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">{icon}</div>
        <span className="text-sm font-semibold">{title}</span>
      </div>
      <p className="text-sm text-muted-foreground flex-1">{description}</p>
      <div className="mt-4">{children}</div>
    </div>
  );
}
