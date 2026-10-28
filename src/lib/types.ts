export type ID = string;

export interface Customer {
  id: ID;
  name: string;
  company: string;
  currency: string;
  hourlyRate: number;
  active: boolean;
  taxExempt: boolean;
  gstRateOverride: number | null;
  pstRateOverride: number | null;
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

export interface Expense {
  id: ID;
  date: string; // YYYY-MM-DD
  vendor: string;
  category: string;
  subtotal: number;
  gst: number;
  pst: number;
  total: number;
  currency: string;
  customerId: ID | null;
  projectId: ID | null;
  notes: string;
  receiptPath: string | null;
  billableToCustomer: boolean;
  invoiced: boolean;
}

export interface TaxSettings {
  businessName: string;
  businessEmail: string;
  businessAddress: string;
  gstNumber: string;
  pstNumber: string;
  defaultGstRate: number;
  defaultPstRate: number;
  chargeGst: boolean;
  chargePst: boolean;
}

export const EXPENSE_CATEGORIES = [
  "Meals & Entertainment (50%)",
  "Vehicle",
  "Office supplies",
  "Software & Subscriptions",
  "Travel",
  "Professional fees",
  "Home office",
  "Advertising",
  "Bank fees",
  "Other",
] as const;

export const CARD_PRIORITIES = ["Urgent", "High", "Medium", "Low"] as const;
export type CardPriority = (typeof CARD_PRIORITIES)[number];

export interface Board {
  id: ID;
  name: string;
  position: number;
}

export interface BoardColumn {
  id: ID;
  boardId: ID;
  title: string;
  position: number;
}

export interface BoardCard {
  id: ID;
  columnId: ID;
  title: string;
  description: string;
  priority: CardPriority;
  dueDate: string | null; // YYYY-MM-DD
  position: number;
}

export interface AppState {
  customers: Customer[];
  projects: Project[];
  activities: Activity[]; // legacy
  timesheets: Timesheet[];
  expenses: Expense[];
  taxSettings: TaxSettings;
  boards: Board[];
  boardColumns: BoardColumn[];
  boardCards: BoardCard[];
  running: RunningTimer | null;
}
