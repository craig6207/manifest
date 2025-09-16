import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/app/environment/environment';
import { InviteResponse } from 'src/app/interfaces/notification';

@Injectable({ providedIn: 'root' })
export class JobPipelineService {
  private http = inject(HttpClient);

  respondToInvite(dto: InviteResponse) {
    return this.http.post(
      `${environment.apiEndpoint}/api/jobpipeline/invite/respond`,
      dto
    );
  }
}
