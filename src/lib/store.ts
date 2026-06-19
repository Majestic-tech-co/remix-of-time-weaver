import { useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { AppState, Customer, Project, Timesheet, RunningTimer } from "./types";

const RUNNING_KEY = "timetracker.running.v1";

const emptyState: AppState = {
  customers: [],
  projects: [],
  activities: [],
  timesheets: [],
  running: null,
};

let state: AppState = { ...emptyState };
let currentUserId: string | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function setState(next: AppState) {
  state = next;
  emit();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

const serverSnap: AppState = { ...emptyState };
export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, () => state, () => serverSnap);
}

// ---------- mappers ----------
type DbCustomer = {
  id: string; name: string; company: string; currency: string;
  hourly_rate: number | string; active: boolean;
};
type DbProject = {
  id: string; customer_id: string; name: string;
  budget_type: "none" | "hours" | "money"; budget: number | string; active: boolean;
};
type DbTimesheet = {
  id: string; project_id: string; description: string;
  start_time: number | string; end_time: number | string; duration: number;
  hourly_rate: number | string; billable: boolean;
};

const num = (v: number | string) => (typeof v === "string" ? parseFloat(v) : v);

const mapCustomer = (r: DbCustomer): Customer => ({
  id: r.id, name: r.name, company: r.company, currency: r.currency,
  hourlyRate: num(r.hourly_rate), active: r.active,
});
const mapProject = (r: DbProject): Project => ({
  id: r.id, customerId: r.customer_id, name: r.name,
  budgetType: r.budget_type, budget: num(r.budget), active: r.active,
});
const mapTimesheet = (r: DbTimesheet): Timesheet => ({
  id: r.id, projectId: r.project_id, description: r.description,
  startTime: Number(r.start_time), endTime: Number(r.end_time),
  duration: r.duration, hourlyRate: num(r.hourly_rate), billable: r.billable,
});

// ---------- running timer (local) ----------
function loadRunning(): RunningTimer | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(RUNNING_KEY);
    return raw ? JSON.parse(raw) as RunningTimer : null;
  } catch { return null; }
}
function saveRunning(r: RunningTimer | null) {
  if (typeof window === "undefined") return;
  if (r) localStorage.setItem(RUNNING_KEY, JSON.stringify(r));
  else localStorage.removeItem(RUNNING_KEY);
}

// ---------- loading ----------
let loadInflight: Promise<void> | null = null;

async function loadAll() {
  if (!currentUserId) {
    setState({ ...emptyState, running: null });
    saveRunning(null);
    return;
  }
  if (loadInflight) return loadInflight;
  loadInflight = (async () => {
    const [cRes, pRes, tRes] = await Promise.all([
      supabase.from("customers").select("*").order("name") as unknown as Promise<{ data: DbCustomer[] | null; error: { message: string } | null }>,
      supabase.from("projects").select("*").order("name") as unknown as Promise<{ data: DbProject[] | null; error: { message: string } | null }>,
      supabase.from("timesheets").select("*").order("start_time", { ascending: false }) as unknown as Promise<{ data: DbTimesheet[] | null; error: { message: string } | null }>,
    ]);
    if (cRes.error) toast.error(cRes.error.message);
    if (pRes.error) toast.error(pRes.error.message);
    if (tRes.error) toast.error(tRes.error.message);
    setState({
      customers: (cRes.data ?? []).map(mapCustomer),
      projects: (pRes.data ?? []).map(mapProject),
      activities: [],
      timesheets: (tRes.data ?? []).map(mapTimesheet),
      running: loadRunning(),
    });
  })();
  try { await loadInflight; } finally { loadInflight = null; }
}

if (typeof window !== "undefined") {
  supabase.auth.getSession().then(({ data }) => {
    currentUserId = data.session?.user.id ?? null;
    void loadAll();
  });
  supabase.auth.onAuthStateChange((event, session) => {
    const next = session?.user.id ?? null;
    if (next === currentUserId && event !== "SIGNED_OUT") return;
    currentUserId = next;
    if (event === "SIGNED_OUT") saveRunning(null);
    void loadAll();
  });
}

// ---------- helpers ----------
function requireUser(): string | null {
  if (!currentUserId) {
    toast.error("Please sign in first.");
    return null;
  }
  return currentUserId;
}

export function resolveRate(opts: { customerId: string | null }): number {
  if (opts.customerId) {
    const c = state.customers.find((x) => x.id === opts.customerId);
    if (c) return c.hourlyRate;
  }
  return 0;
}

// ---------- Customers ----------
export const customerActions = {
  async create(input: Omit<Customer, "id">) {
    const uid = requireUser(); if (!uid) return;
    const { data, error } = await supabase.from("customers").insert({
      user_id: uid, name: input.name, company: input.company,
      currency: input.currency, hourly_rate: input.hourlyRate, active: input.active,
    }).select().single();
    if (error || !data) { toast.error(error?.message ?? "Failed"); return; }
    setState({ ...state, customers: [...state.customers, mapCustomer(data)].sort((a, b) => a.name.localeCompare(b.name)) });
  },
  async update(id: string, patch: Partial<Customer>) {
    const db: Record<string, unknown> = {};
    if (patch.name !== undefined) db.name = patch.name;
    if (patch.company !== undefined) db.company = patch.company;
    if (patch.currency !== undefined) db.currency = patch.currency;
    if (patch.hourlyRate !== undefined) db.hourly_rate = patch.hourlyRate;
    if (patch.active !== undefined) db.active = patch.active;
    const { data, error } = await supabase.from("customers").update(db as never).eq("id", id).select().single();
    if (error || !data) { toast.error(error?.message ?? "Failed"); return; }
    setState({ ...state, customers: state.customers.map((c) => c.id === id ? mapCustomer(data as DbCustomer) : c) });
  },
  async remove(id: string) {
    const { error } = await supabase.from("customers").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setState({ ...state, customers: state.customers.filter((c) => c.id !== id) });
  },
};

// ---------- Projects ----------
export const projectActions = {
  async create(input: Omit<Project, "id">) {
    const uid = requireUser(); if (!uid) return;
    const { data, error } = await supabase.from("projects").insert({
      user_id: uid, customer_id: input.customerId, name: input.name,
      budget_type: input.budgetType, budget: input.budget, active: input.active,
    }).select().single();
    if (error || !data) { toast.error(error?.message ?? "Failed"); return; }
    setState({ ...state, projects: [...state.projects, mapProject(data as DbProject)] });
  },
  async update(id: string, patch: Partial<Project>) {
    const db: Record<string, unknown> = {};
    if (patch.name !== undefined) db.name = patch.name;
    if (patch.customerId !== undefined) db.customer_id = patch.customerId;
    if (patch.budgetType !== undefined) db.budget_type = patch.budgetType;
    if (patch.budget !== undefined) db.budget = patch.budget;
    if (patch.active !== undefined) db.active = patch.active;
    const { data, error } = await supabase.from("projects").update(db as never).eq("id", id).select().single();
    if (error || !data) { toast.error(error?.message ?? "Failed"); return; }
    setState({ ...state, projects: state.projects.map((p) => p.id === id ? mapProject(data as DbProject) : p) });
  },
  async remove(id: string) {
    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setState({ ...state, projects: state.projects.filter((p) => p.id !== id) });
  },
};

// ---------- Timesheets ----------
export const timesheetActions = {
  async create(input: Omit<Timesheet, "id">) {
    const uid = requireUser(); if (!uid) return;
    const { data, error } = await supabase.from("timesheets").insert({
      user_id: uid, project_id: input.projectId, description: input.description,
      start_time: input.startTime, end_time: input.endTime, duration: input.duration,
      hourly_rate: input.hourlyRate, billable: input.billable,
    }).select().single();
    if (error || !data) { toast.error(error?.message ?? "Failed"); return; }
    setState({ ...state, timesheets: [mapTimesheet(data), ...state.timesheets] });
  },
  async update(id: string, patch: Partial<Timesheet>) {
    const db: Record<string, unknown> = {};
    if (patch.description !== undefined) db.description = patch.description;
    if (patch.projectId !== undefined) db.project_id = patch.projectId;
    if (patch.startTime !== undefined) db.start_time = patch.startTime;
    if (patch.endTime !== undefined) db.end_time = patch.endTime;
    if (patch.hourlyRate !== undefined) db.hourly_rate = patch.hourlyRate;
    if (patch.billable !== undefined) db.billable = patch.billable;
    if (patch.startTime !== undefined || patch.endTime !== undefined) {
      const existing = state.timesheets.find((t) => t.id === id);
      const s = patch.startTime ?? existing?.startTime ?? 0;
      const e = patch.endTime ?? existing?.endTime ?? 0;
      db.duration = Math.max(0, Math.round((e - s) / 1000));
    }
    const { data, error } = await supabase.from("timesheets").update(db as never).eq("id", id).select().single();
    if (error || !data) { toast.error(error?.message ?? "Failed"); return; }
    setState({ ...state, timesheets: state.timesheets.map((t) => t.id === id ? mapTimesheet(data as DbTimesheet) : t) });
  },
  async remove(id: string) {
    const { error } = await supabase.from("timesheets").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setState({ ...state, timesheets: state.timesheets.filter((t) => t.id !== id) });
  },
};

// ---------- Timer (local state, DB write on stop) ----------
export const timerActions = {
  start(input: Omit<RunningTimer, "startTime"> & { startTime?: number }) {
    const r: RunningTimer = { ...input, startTime: input.startTime ?? Date.now() };
    saveRunning(r);
    setState({ ...state, running: r });
  },
  update(patch: Partial<RunningTimer>) {
    if (!state.running) return;
    const next = { ...state.running, ...patch };
    saveRunning(next);
    setState({ ...state, running: next });
  },
  async stop(): Promise<Timesheet | null> {
    const r = state.running;
    if (!r || !r.projectId) {
      saveRunning(null);
      setState({ ...state, running: null });
      return null;
    }
    const project = state.projects.find((p) => p.id === r.projectId);
    const rate = resolveRate({ customerId: project?.customerId ?? null });
    const end = Date.now();
    const duration = Math.max(1, Math.round((end - r.startTime) / 1000));
    const uid = requireUser();
    if (!uid) return null;
    const { data, error } = await supabase.from("timesheets").insert({
      user_id: uid, project_id: r.projectId, description: r.description,
      start_time: r.startTime, end_time: end, duration,
      hourly_rate: rate, billable: r.billable,
    }).select().single();
    saveRunning(null);
    if (error || !data) {
      toast.error(error?.message ?? "Failed to save entry");
      setState({ ...state, running: null });
      return null;
    }
    const t = mapTimesheet(data);
    setState({ ...state, timesheets: [t, ...state.timesheets], running: null });
    return t;
  },
  cancel() {
    saveRunning(null);
    setState({ ...state, running: null });
  },
};
