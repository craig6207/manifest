export type JobStatus = 'APPLIED' | 'OFFERED' | 'IN_WORK' | 'COMPLETE';

export type Segment = 'BOOKED' | 'OFFERED' | 'APPLIED';

export interface Page<T> {
  items: T[];
  nextCursor?: string | null;
}

export interface CandidateJobs {
  id: string;
  jobId: string;
  title: string;
  clientName: string;
  location: string;
  startDateUtc: string;
  endDateUtc?: string;
  hourlyRate?: number;
  status: JobStatus;
  nextShiftUtc?: string;
  appliedAtUtc?: string;
  offeredAtUtc?: string;
}

export interface JobActivitySummary {
  booked: number;
  offered: number;
  applied: number;
}
