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
      body: custExpenses.map((e) => [formatDate(new Date(e.date).getTime()), e.vendor, e.category, formatMoney(e.total, currency)]),
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
  currency?: string;
}

export function generateAnnualExpenseReport(input: AnnualExpenseInput): jsPDF {
  const { year, expenses, settings, currency = "CAD" } = input;
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

  const byCat = new Map<string, { subtotal: number; gst: number; pst: number; total: number; count: number }>();
  for (const e of yearExp) {
    const c = byCat.get(e.category) ?? { subtotal: 0, gst: 0, pst: 0, total: 0, count: 0 };
    c.subtotal += e.subtotal; c.gst += e.gst; c.pst += e.pst; c.total += e.total; c.count += 1;
    byCat.set(e.category, c);
  }
  const catRows = Array.from(byCat.entries()).map(([cat, v]) => [
    cat,
    String(v.count),
    formatMoney(v.subtotal, currency),
    formatMoney(v.gst, currency),
    formatMoney(v.pst, currency),
    formatMoney(v.total, currency),
  ]);
  const totals = yearExp.reduce(
    (acc, e) => ({ subtotal: acc.subtotal + e.subtotal, gst: acc.gst + e.gst, pst: acc.pst + e.pst, total: acc.total + e.total }),
    { subtotal: 0, gst: 0, pst: 0, total: 0 },
  );

  autoTable(doc, {
    startY: 140,
    head: [["Category", "#", "Subtotal", "GST (ITC)", "PST", "Total"]],
    body: catRows,
    foot: [["Total", String(yearExp.length), formatMoney(totals.subtotal, currency), formatMoney(totals.gst, currency), formatMoney(totals.pst, currency), formatMoney(totals.total, currency)]],
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
      formatMoney(e.subtotal, currency),
      formatMoney(e.gst, currency),
      formatMoney(e.pst, currency),
      formatMoney(e.total, currency),
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

  const currency = customers[0]?.currency || "CAD";

  autoTable(doc, {
    startY: 140,
    head: [["Customer", "Hours", "Services", "GST", "PST", "Reimb.", "Total"]],
    body: rows.map((r) => [
      r.c.company || r.c.name,
      r.hours.toFixed(2),
      formatMoney(r.services, currency),
      formatMoney(r.gst, currency),
      formatMoney(r.pst, currency),
      formatMoney(r.reimb, currency),
      formatMoney(r.total, currency),
    ]),
    foot: [[
      "Total", rows.reduce((s, r) => s + r.hours, 0).toFixed(2),
      formatMoney(rows.reduce((s, r) => s + r.services, 0), currency),
      formatMoney(rows.reduce((s, r) => s + r.gst, 0), currency),
      formatMoney(rows.reduce((s, r) => s + r.pst, 0), currency),
      formatMoney(rows.reduce((s, r) => s + r.reimb, 0), currency),
      formatMoney(rows.reduce((s, r) => s + r.total, 0), currency),
    ]],
    styles: { fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: [30, 30, 35] },
    footStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: "bold" },
    columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" }, 5: { halign: "right" }, 6: { halign: "right" } },
    margin: { left: margin, right: margin },
  });

  footer(doc);
  return doc;
}
