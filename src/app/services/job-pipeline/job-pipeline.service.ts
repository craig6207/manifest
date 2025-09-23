import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/app/environment/environment';
import {
  CandidateConfirmApplyRequest,
  CandidateResponse,
} from 'src/app/interfaces/notification';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class JobPipelineService {
  private http = inject(HttpClient);

  respondToInvite(dto: CandidateResponse) {
    return this.http.post(
      `${environment.apiEndpoint}/api/jobpipeline/invite/respond`,
      dto
    );
  }

  respondToPlacement(dto: CandidateResponse): Observable<any> {
    return this.http.post(
      `${environment.apiEndpoint}/api/jobpipeline/placement/respond`,
      dto
    );
  }

  confirmApply(req: CandidateConfirmApplyRequest): Observable<any> {
    return this.http.post(
      `${environment.apiEndpoint}/api/jobpipeline/placement/confirm`,
      req
    );
  }
}
