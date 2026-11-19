import { strToU8, zipSync, type Zippable } from "fflate";
import { supabase } from "@/integrations/supabase/client";
import { fetchAll } from "./fetch-all";

const TABLES = [
  { name: "customers", order: [["name"]] },
  { name: "projects", order: [["name"]] },
  { name: "timesheets", order: [["start_time"]] },
  { name: "expenses", order: [["expense_date"]] },
  { name: "boards", order: [["position"]] },
  { name: "board_columns", order: [["position"]] },
  { name: "board_cards", order: [["position"]] },
] as const;

type Row = Record<string, unknown>;

function toCsv(rows: Row[]): string {
  if (rows.length === 0) return "";
  const columns = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
  const cell = (v: unknown) => {
    if (v === null || v === undefined) return "";
    const s = typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [columns.join(","), ...rows.map((r) => columns.map((c) => cell(r[c])).join(","))].join("\r\n") + "\r\n";
}

// Timesheet times are stored as epoch milliseconds; add readable columns for spreadsheets.
function withReadableTimes(rows: Row[]): Row[] {
  return rows.map((r) => ({
    ...r,
    start_local: new Date(Number(r.start_time)).toLocaleString(),
    end_local: new Date(Number(r.end_time)).toLocaleString(),
    hours: (Number(r.duration) / 3600).toFixed(2),
  }));
}

const README = `Majestic data export
====================

data.json      Everything below in one file (a complete backup).
*.csv          One spreadsheet per table; open with Excel, Numbers or Google Sheets.
receipts/      The receipt files you uploaded, named by their storage path.

Timesheet start_time/end_time are milliseconds since 1970 (UTC); start_local,
end_local and hours are added for convenience.
`;

export async function exportAllData(onProgress?: (message: string) => void): Promise<{ receiptsMissing: number }> {
  const data: Record<string, Row[]> = {};
  for (const t of TABLES) {
    onProgress?.(`Reading ${t.name.replace("_", " ")}…`);
    const { data: rows, error } = await fetchAll<Row>(t.name, t.order.map(([c]) => [c] as [string]));
    if (error) throw new Error(`Couldn't read ${t.name}: ${error.message}`);
    data[t.name] = rows;
  }
  const { data: settings, error: settingsError } = await fetchAll<Row>("tax_settings", [], "user_id");
  if (settingsError) throw new Error(`Couldn't read tax settings: ${settingsError.message}`);
  data.tax_settings = settings;

  const files: Zippable = {
    "README.txt": strToU8(README),
    "data.json": strToU8(JSON.stringify({ exported_at: new Date().toISOString(), ...data }, null, 2)),
  };
  for (const [name, rows] of Object.entries(data)) {
    files[`${name}.csv`] = strToU8(toCsv(name === "timesheets" ? withReadableTimes(rows) : rows));
  }

  const paths = data.expenses.map((e) => e.receipt_path).filter((p): p is string => typeof p === "string" && p.length > 0);
  let receiptsMissing = 0;
  for (const [i, path] of paths.entries()) {
    onProgress?.(`Downloading receipt ${i + 1} of ${paths.length}…`);
    const { data: blob, error } = await supabase.storage.from("receipts").download(path);
    if (error || !blob) { receiptsMissing++; continue; }
    files[`receipts/${path}`] = [new Uint8Array(await blob.arrayBuffer()), { level: 0 }];
  }

  onProgress?.("Building ZIP…");
  const zipped = zipSync(files, { level: 6 });
  const url = URL.createObjectURL(new Blob([zipped], { type: "application/zip" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `majestic-export-${new Date().toISOString().slice(0, 10)}.zip`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return { receiptsMissing };
}
