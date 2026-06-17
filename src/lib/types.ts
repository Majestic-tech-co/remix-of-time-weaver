export type ID = string;

export interface Customer {
  id: ID;
  name: string;
  company: string;
  currency: string;
  hourlyRate: number;
  active: boolean;
}

export interface Project {
  id: ID;
  customerId: ID;
  name: string;
  budgetType: "money" | "hours" | "none";
  budget: number;
  active: boolean;
}

// Kept for backward-compat with previously-stored timesheets; no longer
// surfaced in the UI.
export interface Activity {
  id: ID;
  projectId: ID | null;
  name: string;
  hourlyRate: number | null;
}

export interface Timesheet {
  id: ID;
  projectId: ID;
  activityId?: ID; // legacy, optional
  description: string;
  startTime: number;
  endTime: number;
  duration: number;
  hourlyRate: number;
  billable: boolean;
}

export interface RunningTimer {
  startTime: number;
  description: string;
  customerId: ID | null;
  projectId: ID | null;
  billable: boolean;
}

export interface AppState {
  customers: Customer[];
  projects: Project[];
  activities: Activity[]; // legacy, kept for stored data
  timesheets: Timesheet[];
  running: RunningTimer | null;
}
