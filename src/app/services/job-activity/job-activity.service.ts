import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { CandidateJobs, Page } from 'src/app/interfaces/candidate-jobs';
import { Observable, map } from 'rxjs';
import { environment } from 'src/app/environment/environment';

@Injectable({ providedIn: 'root' })
export class JobActivityService {
  private readonly http = inject(HttpClient);

  getMyJobs(options: {
    segment: 'BOOKED' | 'OFFERED' | 'APPLIED';
    page?: number;
    pageSize?: number;
  }): Observable<Page<CandidateJobs>> {
    const page = options.page ?? 1;
    const pageSize = options.pageSize ?? 20;

    let params = new HttpParams()
      .set('segment', options.segment)
      .set('page', page)
      .set('pageSize', pageSize);

    return this.http
      .get<{
        items: any[];
        total: number;
        page: number;
        pageSize: number;
      }>(`${environment.apiEndpoint}/api/job-history/mine`, { params })
      .pipe(
        map((res) => {
          const hasMore = res.page * res.pageSize < res.total;
          return {
            items: (res.items ?? []).map(this.mapServerToCandidateJobs),
            nextCursor: hasMore ? String(res.page + 1) : null,
          } as Page<CandidateJobs>;
        })
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
