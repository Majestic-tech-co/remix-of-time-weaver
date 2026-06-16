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

export interface Activity {
  id: ID;
  projectId: ID | null; // null = global
  name: string;
  hourlyRate: number | null;
}

export interface Timesheet {
  id: ID;
  projectId: ID;
  activityId: ID;
  description: string;
  startTime: number; // ms epoch
  endTime: number;   // ms epoch
  duration: number;  // seconds
  hourlyRate: number;
  billable: boolean;
}

export interface RunningTimer {
  startTime: number;
  description: string;
  customerId: ID | null;
  projectId: ID | null;
  activityId: ID | null;
  billable: boolean;
}

export interface AppState {
  customers: Customer[];
  projects: Project[];
  activities: Activity[];
  timesheets: Timesheet[];
  running: RunningTimer | null;
}
