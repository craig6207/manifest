import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/app/environment/environment';
import { JobPlacementDetails } from 'src/app/interfaces/job-details';

@Injectable({ providedIn: 'root' })
export class JobPlacementDetailsService {
  private http = inject(HttpClient);

  getForJobAndCandidate(
    jobListingId: number,
    candidateId: number
  ): Observable<JobPlacementDetails> {
    return this.http.get<JobPlacementDetails>(
      `${environment.apiEndpoint}/api/placement-details/job/${jobListingId}/candidate/${candidateId}`
    );
  }
}
