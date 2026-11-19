import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Customer, Project, Timesheet, Expense, TaxSettings } from "./types";
import { formatDate, formatMoney } from "./format";
import { customerTaxRates } from "./store";

function header(doc: jsPDF, title: string, subtitle: string, settings: TaxSettings) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(title, margin, 60);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(110);
  doc.text(subtitle, margin, 78);
  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.text(settings.businessName || "Your Business", pageWidth - margin, 60, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60);
  const lines = [settings.businessEmail, settings.businessAddress].filter(Boolean);
  if (settings.gstNumber) lines.push(`GST/HST #: ${settings.gstNumber}`);
  if (settings.pstNumber) lines.push(`PST/RST #: ${settings.pstNumber}`);
  lines.forEach((l, i) => doc.text(l, pageWidth - margin, 76 + i * 12, { align: "right" }));
}

function footer(doc: jsPDF) {
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFontSize(8);
  doc.setTextColor(140);
  doc.text(`Generated ${formatDate(Date.now())}`, 40, pageHeight - 20);
  doc.text("Majestic Time Tracking", pageWidth - 40, pageHeight - 20, { align: "right" });
}

export interface YearEndCustomerInput {
  customer: Customer;
  year: number;
  timesheets: Timesheet[];
  expenses: Expense[];
  projects: Project[];
  settings: TaxSettings;
}

export function generateYearEndCustomerReport(input: YearEndCustomerInput): jsPDF {
  const { customer, year, timesheets, expenses, projects, settings } = input;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 40;

  const start = new Date(year, 0, 1).getTime();
  const end = new Date(year + 1, 0, 1).getTime();

  const custProjectIds = new Set(projects.filter((p) => p.customerId === customer.id).map((p) => p.id));
  const entries = timesheets
    .filter((t) => custProjectIds.has(t.projectId) && t.startTime >= start && t.startTime < end && t.billable)
    .sort((a, b) => a.startTime - b.startTime);
  const custExpenses = expenses
    .filter((e) => e.customerId === customer.id && new Date(e.date).getTime() >= start && new Date(e.date).getTime() < end && e.billableToCustomer)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  header(doc, `${year} Year-End Statement`, `${customer.company || customer.name}`, settings);

  const totalHours = entries.reduce((s, e) => s + e.duration / 3600, 0);
  const services = entries.reduce((s, e) => s + (e.duration / 3600) * e.hourlyRate, 0);
  const { gst: gstRate, pst: pstRate } = customerTaxRates(customer, settings);
  const gstCollected = services * gstRate;
  const pstCollected = services * pstRate;
  const reimbursed = custExpenses.reduce((s, e) => s + e.total, 0);
  const grand = services + gstCollected + pstCollected + reimbursed;
  const currency = customer.currency || "CAD";

  autoTable(doc, {
    startY: 140,
    theme: "plain",
    styles: { fontSize: 10 },
    body: [
      ["Total billable hours", totalHours.toFixed(2)],
      ["Services income (before tax)", formatMoney(services, currency)],
      ...(gstRate > 0 ? [[`GST collected (${(gstRate * 100).toFixed(1)}%)`, formatMoney(gstCollected, currency)]] : []),
      ...(pstRate > 0 ? [[`PST collected (${(pstRate * 100).toFixed(1)}%)`, formatMoney(pstCollected, currency)]] : []),
      ["Reimbursed expenses billed", formatMoney(reimbursed, currency)],
      ["Total invoiced (gross)", formatMoney(grand, currency)],
    ],
    columnStyles: { 0: { fontStyle: "bold" }, 1: { halign: "right" } },
    margin: { left: margin, right: margin },
  });

  // @ts-expect-error added by autoTable
  let y = doc.lastAutoTable.finalY + 20;

  if (entries.length) {
    doc.setFont("helvetica", "bold");
    doc.text("Time entries", margin, y);
    autoTable(doc, {
      startY: y + 8,
      head: [["Date", "Project", "Hours", "Rate", "Amount"]],
      body: entries.map((e) => {
        const p = projects.find((x) => x.id === e.projectId);
        const hours = e.duration / 3600;
        return [
          formatDate(e.startTime),
          p?.name ?? "—",
          hours.toFixed(2),
          formatMoney(e.hourlyRate, currency),
          formatMoney(hours * e.hourlyRate, currency),
        ];
      }),
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: [30, 30, 35] },
      columnStyles: { 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" } },
      margin: { left: margin, right: margin },
    });
    // @ts-expect-error added
    y = doc.lastAutoTable.finalY + 20;
  }

  if (custExpenses.length) {
    doc.setFont("helvetica", "bold");
    doc.text("Reimbursed expenses", margin, y);
    autoTable(doc, {
      startY: y + 8,
      head: [["Date", "Vendor", "Category", "Total"]],
      body: custExpenses.map((e) => [formatDate(new Date(e.date).getTime()), e.vendor, e.category, formatMoney(e.total, e.currency)]),
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: [30, 30, 35] },
      columnStyles: { 3: { halign: "right" } },
      margin: { left: margin, right: margin },
    });
  }

  footer(doc);
  return doc;
}

export interface AnnualExpenseInput {
  year: number;
  expenses: Expense[];
  settings: TaxSettings;
}

export function generateAnnualExpenseReport(input: AnnualExpenseInput): jsPDF {
  const { year, expenses, settings } = input;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 40;

  const start = new Date(year, 0, 1).getTime();
  const end = new Date(year + 1, 0, 1).getTime();
  const yearExp = expenses
    .filter((e) => {
      const t = new Date(e.date).getTime();
      return t >= start && t < end;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  header(doc, `${year} Expense Summary`, "Deductible business expenses (for T2125 / bookkeeping)", settings);

  // Grouped by category and currency so CAD and foreign amounts are never summed together.
  type Sums = { subtotal: number; gst: number; pst: number; total: number; count: number };
  const empty = (): Sums => ({ subtotal: 0, gst: 0, pst: 0, total: 0, count: 0 });
  const add = (into: Sums, e: Expense) => {
    into.subtotal += e.subtotal; into.gst += e.gst; into.pst += e.pst; into.total += e.total; into.count += 1;
  };
  const byCat = new Map<string, { category: string; currency: string; sums: Sums }>();
  const byCurrency = new Map<string, Sums>();
  for (const e of yearExp) {
    const key = `${e.category}|${e.currency}`;
    const c = byCat.get(key) ?? { category: e.category, currency: e.currency, sums: empty() };
    add(c.sums, e);
    byCat.set(key, c);
    const t = byCurrency.get(e.currency) ?? empty();
    add(t, e);
    byCurrency.set(e.currency, t);
  }
  const moneyCells = (v: Sums, cur: string) => [formatMoney(v.subtotal, cur), formatMoney(v.gst, cur), formatMoney(v.pst, cur), formatMoney(v.total, cur)];
  const catRows = Array.from(byCat.values()).map(({ category, currency, sums }) => [category, String(sums.count), ...moneyCells(sums, currency)]);
  const footRows = Array.from(byCurrency.entries()).map(([cur, sums]) => [
    byCurrency.size > 1 ? `Total (${cur})` : "Total", String(sums.count), ...moneyCells(sums, cur),
  ]);

  autoTable(doc, {
    startY: 140,
    head: [["Category", "#", "Subtotal", "GST (ITC)", "PST", "Total"]],
    body: catRows,
    foot: footRows.length ? footRows : [["Total", "0", ...moneyCells(empty(), "CAD")]],
    styles: { fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: [30, 30, 35] },
    footStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: "bold" },
    columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" }, 5: { halign: "right" } },
    margin: { left: margin, right: margin },
  });

  // @ts-expect-error added
  let y = doc.lastAutoTable.finalY + 20;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("All receipts", margin, y);
  autoTable(doc, {
    startY: y + 8,
    head: [["Date", "Vendor", "Category", "Subtotal", "GST", "PST", "Total"]],
    body: yearExp.map((e) => [
      formatDate(new Date(e.date).getTime()),
      e.vendor,
      e.category,
      formatMoney(e.subtotal, e.currency),
      formatMoney(e.gst, e.currency),
      formatMoney(e.pst, e.currency),
      formatMoney(e.total, e.currency),
    ]),
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [30, 30, 35] },
    columnStyles: { 3: { halign: "right" }, 4: { halign: "right" }, 5: { halign: "right" }, 6: { halign: "right" } },
    margin: { left: margin, right: margin },
  });

  footer(doc);
  return doc;
}

export interface AllCustomersReportInput {
  year: number;
  customers: Customer[];
  projects: Project[];
  timesheets: Timesheet[];
  expenses: Expense[];
  settings: TaxSettings;
}

export function generateAllCustomersReport(input: AllCustomersReportInput): jsPDF {
  const { year, customers, projects, timesheets, expenses, settings } = input;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 40;
  const start = new Date(year, 0, 1).getTime();
  const end = new Date(year + 1, 0, 1).getTime();

  header(doc, `${year} Income Summary`, "All customers", settings);

  const rows = customers.map((c) => {
    const custProjectIds = new Set(projects.filter((p) => p.customerId === c.id).map((p) => p.id));
    const entries = timesheets.filter((t) => custProjectIds.has(t.projectId) && t.startTime >= start && t.startTime < end && t.billable);
    const hours = entries.reduce((s, e) => s + e.duration / 3600, 0);
    const services = entries.reduce((s, e) => s + (e.duration / 3600) * e.hourlyRate, 0);
    const { gst: gstRate, pst: pstRate } = customerTaxRates(c, settings);
    const gst = services * gstRate;
    const pst = services * pstRate;
    const reimb = expenses
      .filter((e) => e.customerId === c.id && e.billableToCustomer && new Date(e.date).getTime() >= start && new Date(e.date).getTime() < end)
      .reduce((s, e) => s + e.total, 0);
    return { c, hours, services, gst, pst, reimb, total: services + gst + pst + reimb };
  });

  // Each customer is billed in their own currency; totals are kept per currency.
  const currencies = Array.from(new Set(rows.map((r) => r.c.currency)));
  const sum = (rs: typeof rows, k: "hours" | "services" | "gst" | "pst" | "reimb" | "total") => rs.reduce((s, r) => s + r[k], 0);

  autoTable(doc, {
    startY: 140,
    head: [["Customer", "Hours", "Services", "GST", "PST", "Reimb.", "Total"]],
    body: rows.map((r) => [
      r.c.company || r.c.name,
      r.hours.toFixed(2),
      formatMoney(r.services, r.c.currency),
      formatMoney(r.gst, r.c.currency),
      formatMoney(r.pst, r.c.currency),
      formatMoney(r.reimb, r.c.currency),
      formatMoney(r.total, r.c.currency),
    ]),
    foot: currencies.map((cur) => {
      const rs = rows.filter((r) => r.c.currency === cur);
      return [
        currencies.length > 1 ? `Total (${cur})` : "Total", sum(rs, "hours").toFixed(2),
        formatMoney(sum(rs, "services"), cur),
        formatMoney(sum(rs, "gst"), cur),
        formatMoney(sum(rs, "pst"), cur),
        formatMoney(sum(rs, "reimb"), cur),
        formatMoney(sum(rs, "total"), cur),
      ];
    }),
    styles: { fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: [30, 30, 35] },
    footStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: "bold" },
    columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" }, 5: { halign: "right" }, 6: { halign: "right" } },
    margin: { left: margin, right: margin },
  });

  footer(doc);
  return doc;
}
