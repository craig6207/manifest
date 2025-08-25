import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { CandidateJobs, Page } from 'src/app/interfaces/candidate-jobs';
import { Observable, map } from 'rxjs';
import { environment } from 'src/app/environment/environment';

@Injectable({ providedIn: 'root' })
export class JobActivityService {
  private readonly http = inject(HttpClient);

  getMyActivities(
    options: { cursor?: string | null; pageSize?: number } = {}
  ): Observable<Page<CandidateJobs>> {
    let params = new HttpParams();
    if (options.cursor) params = params.set('cursor', options.cursor);
    if (options.pageSize)
      params = params.set('pageSize', String(options.pageSize));

    return this.http
      .get<any>(`${environment.apiEndpoint}/api/me/job-activities`, { params })
      .pipe(
        map((res) => ({
          items: (res.items ?? []).map(this.mapServerToCandidateJobs),
          nextCursor: res.nextCursor ?? null,
        }))
      );
  }

  private mapServerToCandidateJobs = (d: any): CandidateJobs => ({
    id: String(d.activityId ?? d.id),
    jobId: String(d.jobId),
    title: d.title,
    clientName: d.clientName,
    location: d.location,
    startDateUtc: d.startDateUtc,
    endDateUtc: d.endDateUtc,
    hourlyRate: d.hourlyRate,
    status: this.normalizeStatus(d.status),
    nextShiftUtc: d.nextShiftUtc,
    appliedAtUtc: d.appliedAtUtc,
    offeredAtUtc: d.offeredAtUtc,
  });

  private normalizeStatus(
    s: string
  ): 'APPLIED' | 'OFFERED' | 'IN_WORK' | 'COMPLETE' {
    const x = String(s).toUpperCase().replace('-', '_');
    if (x === 'INWORK') return 'IN_WORK';
    if (x === 'APPLIED' || x === 'OFFERED' || x === 'COMPLETE') return x as any;
    if (x === 'IN_WORK') return 'IN_WORK';
    throw new Error(`Unknown status: ${s}`);
  }
}
