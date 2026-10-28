import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { useAppState, taxSettingsActions } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { TaxSettings } from "@/lib/types";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/tax/settings")({
  head: () => ({ meta: [{ title: "Tax settings · Majestic" }] }),
  component: TaxSettingsPage,
});

function TaxSettingsPage() {
  const { taxSettings } = useAppState();
  const [form, setForm] = useState<TaxSettings>(taxSettings);
  const [saving, setSaving] = useState(false);

  useEffect(() => setForm(taxSettings), [taxSettings]);

  function set<K extends keyof TaxSettings>(k: K, v: TaxSettings[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function save() {
    setSaving(true);
    await taxSettingsActions.save(form);
    setSaving(false);
    toast.success("Tax settings saved");
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader title="Tax settings" description="Business info and default tax rates used on invoices and reports." />

      <section className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div>
          <h2 className="text-sm font-semibold">Business</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Shown in the header of invoices and reports.</p>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label className="mb-1.5 block text-xs text-muted-foreground">Business name</Label>
            <Input value={form.businessName} onChange={(e) => set("businessName", e.target.value)} />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs text-muted-foreground">Email</Label>
            <Input value={form.businessEmail} onChange={(e) => set("businessEmail", e.target.value)} />
          </div>
        </div>
        <div>
          <Label className="mb-1.5 block text-xs text-muted-foreground">Address</Label>
          <Textarea rows={2} value={form.businessAddress} onChange={(e) => set("businessAddress", e.target.value)} />
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div>
          <h2 className="text-sm font-semibold">Tax registration</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Your CRA and provincial registration numbers.</p>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label className="mb-1.5 block text-xs text-muted-foreground">GST/HST number</Label>
            <Input value={form.gstNumber} onChange={(e) => set("gstNumber", e.target.value)} placeholder="123456789 RT0001" />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs text-muted-foreground">PST/RST number</Label>
            <Input value={form.pstNumber} onChange={(e) => set("pstNumber", e.target.value)} />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div>
          <h2 className="text-sm font-semibold">Default rates</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Applied to new invoices unless a customer overrides them.</p>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="flex items-center justify-between rounded-md border border-border p-3">
            <div>
              <Label className="text-sm">Charge GST/HST</Label>
              <p className="text-xs text-muted-foreground">Apply to new invoices by default.</p>
            </div>
            <Switch checked={form.chargeGst} onCheckedChange={(v) => set("chargeGst", v)} />
          </div>
          <div className="flex items-center justify-between rounded-md border border-border p-3">
            <div>
              <Label className="text-sm">Charge PST/RST</Label>
              <p className="text-xs text-muted-foreground">Manitoba RST is 7%.</p>
            </div>
            <Switch checked={form.chargePst} onCheckedChange={(v) => set("chargePst", v)} />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs text-muted-foreground">Default GST rate (%)</Label>
            <Input
              type="number" step="0.1" min={0}
              value={(form.defaultGstRate * 100).toFixed(2)}
              onChange={(e) => set("defaultGstRate", (Number(e.target.value) || 0) / 100)}
            />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs text-muted-foreground">Default PST rate (%)</Label>
            <Input
              type="number" step="0.1" min={0}
              value={(form.defaultPstRate * 100).toFixed(2)}
              onChange={(e) => set("defaultPstRate", (Number(e.target.value) || 0) / 100)}
            />
          </div>
        </div>
      </section>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving} className="gap-2">
          <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save settings"}
        </Button>
      </div>
    </div>
  );
}
