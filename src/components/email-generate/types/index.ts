import { DateRange } from "react-day-picker";

export interface AIEmailDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

// Define base form data interface with common fields
export interface BaseFormData {
  recipientName: string;
}

// Update form types to extend base interface
export interface LeaveFormData extends BaseFormData {
  reason: string;
  dateRange: DateRange;
  handoverTo?: string;
  startDate?: string;
  endDate?: string;
  days?: number;
}

export interface ReportFormData extends BaseFormData {
  reportingPeriod: string;
  completedTasks: string;
  ongoingTasks: string;
  nextPeriodPlans: string;
  issues?: string;
}

export interface MeetingFormData extends BaseFormData {
  topic: string;
  agenda: string;
  meetingTime: string;
  meetingDate: string;
  locationOrPlatform: string;
  attendees: string;
  meetingHost?: string;
  preparationMaterials?: string;
}

export interface CustomFormData extends BaseFormData {
  customPrompt: string;
}

export interface ThanksFormData extends BaseFormData {
  reason: string;
  details?: string;
  nextSteps?: string;
}

export interface ApologyFormData extends BaseFormData {
  issue: string;
  explanation: string;
  solution: string;
  commitment?: string;
}

// Define form data type union
export type FormData =
  | LeaveFormData
  | ReportFormData
  | MeetingFormData
  | ThanksFormData
  | ApologyFormData
  | CustomFormData;

// Type guards
export function isLeaveFormData(data: any): data is LeaveFormData {
  return "dateRange" in data && "reason" in data;
}

export function isMeetingFormData(data: any): data is MeetingFormData {
  return "topic" in data && "agenda" in data;
}

export function isReportFormData(data: any): data is ReportFormData {
  return "reportingPeriod" in data && "completedTasks" in data;
}

export function isThanksFormData(data: any): data is ThanksFormData {
  return "reason" in data && !("dateRange" in data);
}

export function isApologyFormData(data: any): data is ApologyFormData {
  return "issue" in data && "solution" in data;
}
