import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from 'src/app/environment/environment';
import {
  JobFilterOptions,
  JobListing,
  JobListingView,
} from 'src/app/interfaces/job-listing';

@Injectable({
  providedIn: 'root',
})
export class JobListingsService {
  private http = inject(HttpClient);

  getForCandidate(
    candidateProfileId: number,
    options?: JobFilterOptions
  ): Observable<JobListing[]> {
    let params = new HttpParams()
      .set('skip', String(options?.skip ?? 0))
      .set('take', String(options?.take ?? 20))
      .set('includePast', String(options?.includePast ?? false));

    if (options?.subCategory)
      params = params.set('subCategory', options.subCategory);
    if (typeof options?.minPay === 'number')
      params = params.set('minPay', String(options.minPay));
    if (options?.startDateFrom)
      params = params.set('startDateFrom', options.startDateFrom);

    return this.http.get<JobListing[]>(
      `${environment.apiEndpoint}/api/joblistings/candidate/${candidateProfileId}`,
      { params }
    );
  }

  getCandidateJobCount(
    applicationUserId: number,
    options?: JobFilterOptions
  ): Observable<number> {
    let params = new HttpParams().set(
      'includePast',
      String(options?.includePast ?? false)
    );

    if (options?.subCategory)
      params = params.set('subCategory', options.subCategory);
    if (typeof options?.minPay === 'number')
      params = params.set('minPay', String(options.minPay));
    if (options?.startDateFrom)
      params = params.set('startDateFrom', options.startDateFrom);

    return this.http
      .get<{ count: number }>(
        `${environment.apiEndpoint}/api/joblistings/candidate/${applicationUserId}/count`,
        { params }
      )
      .pipe(map((r) => r.count));
  }

  getById(jobListingId: number): Observable<JobListingView> {
    return this.http.get<JobListingView>(
      `${environment.apiEndpoint}/api/joblistings/${jobListingId}`
    );
  }
}
