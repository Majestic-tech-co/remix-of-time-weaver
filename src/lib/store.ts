import { useSyncExternalStore } from "react";
import type { AppState, Customer, Project, Timesheet, RunningTimer } from "./types";

const KEY = "timetracker.state.v1";

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function seed(): AppState {
  const cust1: Customer = { id: uid(), name: "Acme Corp", company: "Acme Inc.", currency: "USD", hourlyRate: 120, active: true };
  const cust2: Customer = { id: uid(), name: "Globex", company: "Globex LLC", currency: "USD", hourlyRate: 95, active: true };
  const proj1: Project = { id: uid(), customerId: cust1.id, name: "Website Redesign", budgetType: "hours", budget: 80, active: true };
  const proj2: Project = { id: uid(), customerId: cust1.id, name: "Mobile App", budgetType: "money", budget: 25000, active: true };
  const proj3: Project = { id: uid(), customerId: cust2.id, name: "Internal Tools", budgetType: "hours", budget: 40, active: true };
  return {
    customers: [cust1, cust2],
    projects: [proj1, proj2, proj3],
    activities: [],
    timesheets: [],
    running: null,
  };
}

function load(): AppState {
  if (typeof window === "undefined") {
    return { customers: [], projects: [], activities: [], timesheets: [], running: null };
  }
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      const s = seed();
      localStorage.setItem(KEY, JSON.stringify(s));
      return s;
    }
    const parsed = JSON.parse(raw) as AppState;
    if (!parsed.activities) parsed.activities = [];
    return parsed;
  } catch {
    return seed();
  }
}

let state: AppState = typeof window === "undefined"
  ? { customers: [], projects: [], activities: [], timesheets: [], running: null }
  : load();

const listeners = new Set<() => void>();

function persist() {
  if (typeof window !== "undefined") {
    localStorage.setItem(KEY, JSON.stringify(state));
  }
}

function setState(updater: (s: AppState) => AppState) {
  state = updater(state);
  persist();
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

const serverSnap: AppState = { customers: [], projects: [], activities: [], timesheets: [], running: null };

export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, () => state, () => serverSnap);
}

// Rate hierarchy: customer's hourly rate (activities removed)
export function resolveRate(opts: { customerId: string | null }): number {
  if (opts.customerId) {
    const c = state.customers.find((x) => x.id === opts.customerId);
    if (c) return c.hourlyRate;
  }
  return 0;
}

// ---------- Customers ----------
export const customerActions = {
  create(input: Omit<Customer, "id">) {
    const c: Customer = { ...input, id: uid() };
    setState((s) => ({ ...s, customers: [...s.customers, c] }));
    return c;
  },
  update(id: string, patch: Partial<Customer>) {
    setState((s) => ({ ...s, customers: s.customers.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
  },
  remove(id: string) {
    setState((s) => ({ ...s, customers: s.customers.filter((c) => c.id !== id) }));
  },
};

// ---------- Projects ----------
export const projectActions = {
  create(input: Omit<Project, "id">) {
    const p: Project = { ...input, id: uid() };
    setState((s) => ({ ...s, projects: [...s.projects, p] }));
    return p;
  },
  update(id: string, patch: Partial<Project>) {
    setState((s) => ({ ...s, projects: s.projects.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));
  },
  remove(id: string) {
    setState((s) => ({ ...s, projects: s.projects.filter((p) => p.id !== id) }));
  },
};

// ---------- Timesheets ----------
export const timesheetActions = {
  create(input: Omit<Timesheet, "id">) {
    const t: Timesheet = { ...input, id: uid() };
    setState((s) => ({ ...s, timesheets: [t, ...s.timesheets] }));
    return t;
  },
  update(id: string, patch: Partial<Timesheet>) {
    setState((s) => ({
      ...s,
      timesheets: s.timesheets.map((t) => {
        if (t.id !== id) return t;
        const merged = { ...t, ...patch };
        merged.duration = Math.max(0, Math.round((merged.endTime - merged.startTime) / 1000));
        return merged;
      }),
    }));
  },
  remove(id: string) {
    setState((s) => ({ ...s, timesheets: s.timesheets.filter((t) => t.id !== id) }));
  },
};

// ---------- Timer ----------
export const timerActions = {
  start(input: Omit<RunningTimer, "startTime"> & { startTime?: number }) {
    const r: RunningTimer = { ...input, startTime: input.startTime ?? Date.now() };
    setState((s) => ({ ...s, running: r }));
  },
  update(patch: Partial<RunningTimer>) {
    setState((s) => (s.running ? { ...s, running: { ...s.running, ...patch } } : s));
  },
  stop(): Timesheet | null {
    const r = state.running;
    if (!r || !r.projectId) {
      setState((s) => ({ ...s, running: null }));
      return null;
    }
    const project = state.projects.find((p) => p.id === r.projectId);
    const rate = resolveRate({ customerId: project?.customerId ?? null });
    const end = Date.now();
    const t: Timesheet = {
      id: uid(),
      projectId: r.projectId,
      description: r.description,
      startTime: r.startTime,
      endTime: end,
      duration: Math.max(1, Math.round((end - r.startTime) / 1000)),
      hourlyRate: rate,
      billable: r.billable,
    };
    setState((s) => ({ ...s, timesheets: [t, ...s.timesheets], running: null }));
    return t;
  },
  cancel() {
    setState((s) => ({ ...s, running: null }));
  },
};
