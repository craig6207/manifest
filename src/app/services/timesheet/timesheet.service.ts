import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from 'src/app/environment/environment';
import {
  JobAssignmentSummary,
  TimesheetAdjustmentCreateRequest,
  TimesheetCheckInRequest,
  TimesheetCheckOutRequest,
  TimesheetEligibility,
  TimesheetSession,
  TimesheetWeek,
} from 'src/app/interfaces/timesheets';

@Injectable({
  providedIn: 'root',
})
export class TimesheetService {
  private http = inject(HttpClient);

  getTodayEligibility() {
    return this.http.get<TimesheetEligibility | null>(
      `${environment.apiEndpoint}/api/timesheets/eligibility`
    );
  }

  checkIn(req: TimesheetCheckInRequest) {
    return this.http.post<TimesheetSession>(
      `${environment.apiEndpoint}/api/timesheets/check-in`,
      req
    );
  }

  checkOut(req: TimesheetCheckOutRequest) {
    return this.http.post<TimesheetSession>(
      `${environment.apiEndpoint}/api/timesheets/check-out`,
      req
    );
  }

  getWeek(dateOnlyISO: string, jobListingId?: number | null) {
    let params = new HttpParams().set('date', dateOnlyISO);
    if (jobListingId != null)
      params = params.set('jobListingId', String(jobListingId));
    return this.http.get<TimesheetWeek>(
      `${environment.apiEndpoint}/api/timesheets/week`,
      { params }
    );
  }

  getCurrentJob() {
    return this.http.get<JobAssignmentSummary | null>(
      `${environment.apiEndpoint}/api/timesheets/assignments/current`
    );
  }

  getHistoryJobs() {
    return this.http.get<JobAssignmentSummary[]>(
      `${environment.apiEndpoint}/api/timesheets/assignments/history`
    );
  }

  submitWeekEdits(
    anchorDate: string,
    edits: TimesheetAdjustmentCreateRequest[]
  ): Observable<void> {
    const params = new HttpParams().set('date', anchorDate);
    return this.http
      .post<void>(
        `${environment.apiEndpoint}/api/timesheets/week/edits`,
        edits,
        { params }
      )
      .pipe(map(() => void 0));
  }
}
