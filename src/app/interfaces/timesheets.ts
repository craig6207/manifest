export interface TimesheetEligibility {
  jobCandidateId: string;
  jobListingId: number;
  candidateId: number;
  workDate: string;
  canCheckIn: boolean;
  canCheckOut: boolean;
  sessionId?: string;
  checkInUtc?: string;
  checkOutUtc?: string;
  reason?: string | null;
}

export interface TimesheetSession {
  id: string;
  jobCandidateId: string;
  jobListingId: number;
  candidateId: number;
  workDate: string;
  checkInUtc?: string;
  checkOutUtc?: string;
  status: number;
  clientSignOffStatus: number;
}

export interface TimesheetCheckInRequest {
  jobCandidateId: string;
  clientTimestampUtc?: string;
  lat?: number;
  lng?: number;
}

export interface TimesheetCheckOutRequest {
  sessionId: string;
  clientTimestampUtc?: string;
}

export interface TimesheetWeek {
  weekStart: string;
  weekEnd: string;
  jobCandidateId: string | null;
  jobListingId: number | null;
  weekStatus: string;
  totalHours: number;
  days: TimesheetDay[];
}

export interface TimesheetDay {
  workDate: string;
  checkInUtc: string | null;
  checkOutUtc: string | null;
  clientSignOffStatus: string | null;
  hoursRaw: number;
  hoursNet: number;
  sessionId: string | null;
}

export interface JobAssignmentSummary {
  jobListingId: number;
  role: string;
  clientName: string;
  siteName: string;
  startDate: string;
  endDate: string | null;
  hoursThisWeek?: number | null;
  lastWeekStatus?: string | null;
}

export interface TimesheetAdjustmentCreateRequest {
  jobListingId: number;
  workDate: string;
  proposedCheckInUtc: string | null;
  proposedCheckOutUtc: string | null;
  reason?: string | null;
}
