import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Customer, Project, Timesheet } from "./types";
import { formatDate, formatHours, formatMoney } from "./format";

export interface InvoiceInput {
  customer: Customer;
  entries: Timesheet[];
  projects: Project[];
  invoiceNumber?: string;
  issueDate?: Date;
  dueInDays?: number;
  from?: { name: string; email?: string; address?: string };
  notes?: string;
}

export function generateInvoicePdf(input: InvoiceInput): jsPDF {
  const {
    customer,
    entries,
    projects,
    invoiceNumber = `INV-${Date.now().toString().slice(-6)}`,
    issueDate = new Date(),
    dueInDays = 14,
    from = { name: "Your Company" },
    notes,
  } = input;

  const billable = entries.filter((e) => e.billable);
  const currency = customer.currency || "USD";
  const due = new Date(issueDate);
  due.setDate(due.getDate() + dueInDays);

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
  fromLines.forEach((l, i) => doc.text(l, pageWidth - margin, 76 + i * 14, { align: "right" }));

  let y = 120;
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

  const rows = billable.map((e) => {
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

  const subtotal = billable.reduce((sum, e) => sum + (e.duration / 3600) * e.hourlyRate, 0);
  const totalHours = billable.reduce((sum, e) => sum + e.duration / 3600, 0);

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
  const labelX = pageWidth - margin - 140;
  const valueX = pageWidth - margin;

  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text("Total hours", labelX, endY);
  doc.setTextColor(0);
  doc.text(formatHours(totalHours * 3600), valueX, endY, { align: "right" });

  doc.setTextColor(80);
  doc.text("Subtotal", labelX, endY + 18);
  doc.setTextColor(0);
  doc.text(formatMoney(subtotal, currency), valueX, endY + 18, { align: "right" });

  doc.setDrawColor(200);
  doc.line(labelX, endY + 28, valueX, endY + 28);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Total due", labelX, endY + 46);
  doc.text(formatMoney(subtotal, currency), valueX, endY + 46, { align: "right" });

  if (notes) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(110);
    doc.text("NOTES", margin, endY + 80);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60);
    const wrapped = doc.splitTextToSize(notes, pageWidth - margin * 2);
    doc.text(wrapped, margin, endY + 96);
  }

  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFontSize(8);
  doc.setTextColor(140);
  doc.text(`Generated ${formatDate(Date.now())}`, margin, pageHeight - 20);

  return doc;
}
