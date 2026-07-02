# Tax Section (Manitoba, Canada)

Add a new **Tax** area for tracking deductible receipts, applying GST/PST to invoices, and generating year-end per-customer income reports.

## 1. Database (Lovable Cloud)

New tables (RLS scoped to `auth.uid()`):

- **expenses** — `date`, `vendor`, `category`, `amount_subtotal`, `gst` (5%), `pst` (7% MB RST), `total`, `currency`, `customer_id?`, `project_id?`, `notes`, `receipt_path?`, `billable_to_customer` (bool, for reimbursables)
- **tax_settings** (one row per user) — `business_name`, `gst_number`, `pst_number`, `default_gst_rate` (0.05), `default_pst_rate` (0.07), `charge_gst` (bool), `charge_pst` (bool)

Add columns to **customers**: `tax_exempt` (bool), `gst_rate_override?`, `pst_rate_override?`.

New storage bucket `receipts` (private), with RLS policies so users only read/write files under their own `user_id/` prefix.

## 2. Navigation

New sidebar entries under a "Tax" group:
- **Receipts** — `/tax/receipts`
- **Reports** — `/tax/reports`
- **Settings** — `/tax/settings`

## 3. Pages

### Receipts (`/tax/receipts`)
- Table: Date, Vendor, Category, Subtotal, GST, PST, Total, Customer, Receipt (view link).
- Filters: date range, category, customer, billable-to-customer.
- "Add receipt" dialog: upload image/PDF to `receipts` bucket, auto-fill totals (subtotal + GST/PST math), category dropdown (Meals 50%, Vehicle, Office, Software, Travel, Supplies, Professional fees, Home office, Other), optional customer/project link, "Reimbursable to customer" toggle.
- Row actions: view receipt, edit, delete.
- Category totals summary card.

### Reports (`/tax/reports`)
- **Year-end customer income report** — pick customer + year → PDF with: total billable hours, gross income, GST collected, PST collected, reimbursable expenses billed, and a line-item summary. Suitable to hand to accountant / attach to T2125.
- **Annual expense summary** — pick year → PDF grouped by category with GST/PST totals (ITC-ready).
- **All customers income summary** — pick year → single PDF, one row per customer with totals.
- CSV export alongside each PDF.

### Settings (`/tax/settings`)
- Business name, GST/HST number, PST (MB RST) number.
- Default GST rate (5%), default PST rate (7%), toggle each on/off.
- These flow into invoice generation and receipt entry defaults.

## 4. Invoice changes (`src/lib/invoice.ts` + Invoice dialog)

- Pull `tax_settings` + customer overrides.
- Add lines under subtotal: **GST (5%)**, **PST (7%)**, **Total due**.
- Optional line group: **Reimbursable expenses** (any expense with `billable_to_customer=true`, matching customer + date range, not yet invoiced). Each expense gets a row; mark it "invoiced" after export.
- Show GST/PST numbers in the header when set.
- Invoice number, date, and notes remain configurable.

## 5. Dashboard additions

Small "This quarter" tile: GST collected, GST paid on expenses, net GST owing (rough ITC estimate).

## Technical notes

- New route files under `src/routes/_authenticated/tax.*.tsx` (layout + three leaves).
- Extend `src/lib/store.ts` with expenses + tax_settings loaders/actions (same Supabase pattern as customers/projects).
- Extend `src/lib/types.ts` with `Expense`, `TaxSettings`.
- New `src/lib/tax-reports.ts` for the year-end/annual PDF generators (jsPDF, mirrors `invoice.ts`).
- Receipt upload uses signed URLs for viewing private files.
- All monetary math stored as numeric; GST/PST computed from subtotal on save so historical rate changes don't retroactively alter old receipts.

## Out of scope (say if you want it)

- CRA e-file / NETFILE integration.
- Automatic OCR of receipt images to prefill fields.
- Mileage log (was in the earlier options list — you didn't pick it).
