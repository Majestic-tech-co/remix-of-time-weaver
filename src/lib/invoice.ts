import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Customer, Project, Timesheet, Expense, TaxSettings } from "./types";
import { formatDate, formatHours, formatMoney } from "./format";
import { customerTaxRates } from "./store";

export interface InvoiceInput {
  customer: Customer;
  entries: Timesheet[];
  expenses?: Expense[];
  projects: Project[];
  settings: TaxSettings;
  invoiceNumber?: string;
  issueDate?: Date;
  dueInDays?: number;
  from?: { name: string; email?: string; address?: string };
  notes?: string;
}

export function generateInvoicePdf(input: InvoiceInput): jsPDF {
  const {
    customer, entries, expenses = [], projects, settings,
    invoiceNumber = `INV-${Date.now().toString().slice(-6)}`,
    issueDate = new Date(), dueInDays = 14,
    from = { name: settings.businessName || "Your Company", email: settings.businessEmail || undefined, address: settings.businessAddress || undefined },
    notes,
  } = input;

  const billable = entries.filter((e) => e.billable);
  const currency = customer.currency || "CAD";
  const due = new Date(issueDate);
  due.setDate(due.getDate() + dueInDays);
  const { gst: gstRate, pst: pstRate } = customerTaxRates(customer, settings);

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.text("INVOICE", margin, 60);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(110);
  doc.text(`#${invoiceNumber}`, margin, 78);

  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.text("From", pageWidth - margin, 60, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60);
  const fromLines = [from.name, from.email, from.address].filter(Boolean) as string[];
  if (settings.gstNumber) fromLines.push(`GST/HST #: ${settings.gstNumber}`);
  if (settings.pstNumber) fromLines.push(`PST/RST #: ${settings.pstNumber}`);
  fromLines.forEach((l, i) => doc.text(l, pageWidth - margin, 76 + i * 14, { align: "right" }));

  let y = 140;
  doc.setTextColor(110);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("BILL TO", margin, y);
  doc.setTextColor(0);
  doc.setFontSize(12);
  doc.text(customer.company || customer.name, margin, y + 18);
  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text(customer.name, margin, y + 32);

  doc.setTextColor(110);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("ISSUED", pageWidth - margin - 120, y);
  doc.text("DUE", pageWidth - margin, y, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0);
  doc.text(formatDate(issueDate.getTime()), pageWidth - margin - 120, y + 16);
  doc.text(formatDate(due.getTime()), pageWidth - margin, y + 16, { align: "right" });

  const timeRows = billable.map((e) => {
    const project = projects.find((p) => p.id === e.projectId);
    const hours = e.duration / 3600;
    const amount = hours * e.hourlyRate;
    return [
      formatDate(e.startTime),
      `${project?.name ?? "—"}${e.description ? `\n${e.description}` : ""}`,
      hours.toFixed(2),
      formatMoney(e.hourlyRate, currency),
      formatMoney(amount, currency),
    ];
  });

  const expenseRows = expenses.map((x) => [
    formatDate(new Date(x.date).getTime()),
    `${x.vendor || x.category}${x.notes ? `\n${x.notes}` : ""}`,
    "—", "—",
    formatMoney(x.total, currency),
  ]);

  const rows = [...timeRows, ...expenseRows];

  const timeSubtotal = billable.reduce((sum, e) => sum + (e.duration / 3600) * e.hourlyRate, 0);
  const expenseSubtotal = expenses.reduce((sum, e) => sum + e.total, 0);
  const subtotal = timeSubtotal + expenseSubtotal;
  const totalHours = billable.reduce((sum, e) => sum + e.duration / 3600, 0);
  // Tax applied to services only; reimbursed expenses pass through
  const gstAmount = timeSubtotal * gstRate;
  const pstAmount = timeSubtotal * pstRate;
  const total = subtotal + gstAmount + pstAmount;

  autoTable(doc, {
    startY: y + 60,
    head: [["Date", "Description", "Hours", "Rate", "Amount"]],
    body: rows,
    styles: { font: "helvetica", fontSize: 9, cellPadding: 6, textColor: 30 },
    headStyles: { fillColor: [30, 30, 35], textColor: 255, fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 70 },
      2: { halign: "right", cellWidth: 55 },
      3: { halign: "right", cellWidth: 75 },
      4: { halign: "right", cellWidth: 85 },
    },
    margin: { left: margin, right: margin },
  });

  // @ts-expect-error lastAutoTable is added by autoTable plugin
  const endY: number = doc.lastAutoTable.finalY + 20;
  const labelX = pageWidth - margin - 160;
  const valueX = pageWidth - margin;

  let cursor = endY;
  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text("Total hours", labelX, cursor);
  doc.setTextColor(0);
  doc.text(formatHours(totalHours * 3600), valueX, cursor, { align: "right" });
  cursor += 18;

  doc.setTextColor(80);
  doc.text("Services subtotal", labelX, cursor);
  doc.setTextColor(0);
  doc.text(formatMoney(timeSubtotal, currency), valueX, cursor, { align: "right" });
  cursor += 16;

  if (expenseSubtotal > 0) {
    doc.setTextColor(80);
    doc.text("Reimbursable expenses", labelX, cursor);
    doc.setTextColor(0);
    doc.text(formatMoney(expenseSubtotal, currency), valueX, cursor, { align: "right" });
    cursor += 16;
  }

  if (gstRate > 0) {
    doc.setTextColor(80);
    doc.text(`GST (${(gstRate * 100).toFixed(1)}%)`, labelX, cursor);
    doc.setTextColor(0);
    doc.text(formatMoney(gstAmount, currency), valueX, cursor, { align: "right" });
    cursor += 16;
  }
  if (pstRate > 0) {
    doc.setTextColor(80);
    doc.text(`PST (${(pstRate * 100).toFixed(1)}%)`, labelX, cursor);
    doc.setTextColor(0);
    doc.text(formatMoney(pstAmount, currency), valueX, cursor, { align: "right" });
    cursor += 16;
  }

  doc.setDrawColor(200);
  doc.line(labelX, cursor + 4, valueX, cursor + 4);
  cursor += 20;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Total due", labelX, cursor);
  doc.text(formatMoney(total, currency), valueX, cursor, { align: "right" });

  if (notes) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(110);
    doc.text("NOTES", margin, cursor + 40);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60);
    const wrapped = doc.splitTextToSize(notes, pageWidth - margin * 2);
    doc.text(wrapped, margin, cursor + 56);
  }

  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFontSize(8);
  doc.setTextColor(140);
  doc.text(`Generated ${formatDate(Date.now())}`, margin, pageHeight - 20);

  return doc;
}
