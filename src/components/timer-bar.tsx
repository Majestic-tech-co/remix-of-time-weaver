import { useEffect, useState } from "react";
import { Play, Square } from "lucide-react";
import { toast } from "sonner";
import { useAppState, timerActions, resolveRate } from "@/lib/store";
import { formatDuration, formatMoney } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export function TimerBar() {
  const { customers, projects, running } = useAppState();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  const [description, setDescription] = useState("");
  const [customerId, setCustomerId] = useState<string>("");
  const [projectId, setProjectId] = useState<string>("");
  const [billable, setBillable] = useState(true);

  const activeCustomers = customers.filter((c) => c.active);
  const filteredProjects = projects.filter((p) => p.active && p.customerId === customerId);

  const liveSeconds = running ? Math.floor((Date.now() - running.startTime) / 1000) : 0;
  const liveProject = running ? projects.find((p) => p.id === running.projectId) : null;
  const liveCustomer = liveProject ? customers.find((c) => c.id === liveProject.customerId) : null;
  const liveRate = running ? resolveRate({ customerId: liveCustomer?.id ?? null }) : 0;
  const liveEarnings = running && running.billable ? (liveSeconds / 3600) * liveRate : 0;

  void tick;

  function handleStart() {
    if (!customerId || !projectId) {
      toast.error("Pick a customer and project first.");
      return;
    }
    timerActions.start({ description, customerId, projectId, billable });
    toast.success("Timer started");
  }

  async function handleStop() {
    const t = await timerActions.stop();
    if (t) {
      toast.success(`Saved ${formatDuration(t.duration)} · ${formatMoney(t.billable ? (t.duration / 3600) * t.hourlyRate : 0, liveCustomer?.currency ?? "USD")}`);
    } else {
      toast.message("Timer cancelled");
    }
  }

  if (running) {
    return (
      <div className="rounded-xl border border-primary/30 bg-card p-4 md:p-5">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 sm:flex sm:items-center sm:justify-between">
          <div className="min-w-0 flex items-center gap-4">
            <div className="relative shrink-0">
              <span className="absolute -inset-1 rounded-full bg-primary/30 animate-ping" />
              <span className="relative block h-3 w-3 rounded-full bg-primary" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-medium text-primary">Now tracking</div>
              <div className="truncate font-medium">
                {running.description || <span className="text-muted-foreground italic">No description</span>}
              </div>
              <div className="truncate text-xs text-muted-foreground mt-0.5">
                {liveCustomer?.name} · {liveProject?.name}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:gap-5 shrink-0">
            <div className="text-right">
              <div className="clock text-2xl md:text-3xl font-semibold">
                {formatDuration(liveSeconds)}
              </div>
              {running.billable && liveRate > 0 && (
                <div className="text-xs text-muted-foreground tabular-nums">
                  {formatMoney(liveEarnings, liveCustomer?.currency ?? "USD")} @ {formatMoney(liveRate, liveCustomer?.currency ?? "USD")}/h
                </div>
              )}
            </div>
            <Button onClick={handleStop} variant="destructive" className="gap-2">
              <Square className="h-4 w-4 fill-current" /> Stop
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_190px_190px_auto] lg:items-end">
        <div className="min-w-0">
          <Label className="text-xs text-muted-foreground mb-1.5 block">What are you working on?</Label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Refactoring auth module..."
            className="bg-background"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">Customer</Label>
          <Select value={customerId} onValueChange={(v) => { setCustomerId(v); setProjectId(""); }}>
            <SelectTrigger className="bg-background"><SelectValue placeholder="Select customer" /></SelectTrigger>
            <SelectContent>
              {activeCustomers.length === 0 && <div className="px-3 py-2 text-xs text-muted-foreground">No customers yet</div>}
              {activeCustomers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">Project</Label>
          <Select value={projectId} onValueChange={setProjectId} disabled={!customerId}>
            <SelectTrigger className="bg-background"><SelectValue placeholder={customerId ? "Select project" : "Pick a customer first"} /></SelectTrigger>
            <SelectContent>
              {filteredProjects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              {customerId && filteredProjects.length === 0 && <div className="px-3 py-2 text-xs text-muted-foreground">No projects</div>}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-between gap-4">
          <label htmlFor="billable-toggle" className="flex h-9 items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
            <Switch id="billable-toggle" checked={billable} onCheckedChange={setBillable} />
            Billable
          </label>
          <Button onClick={handleStart} className="gap-2 px-5">
            <Play className="h-3.5 w-3.5 fill-current" /> Start
          </Button>
        </div>
      </div>
    </div>
  );
}
