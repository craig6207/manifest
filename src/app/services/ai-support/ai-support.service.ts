import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/app/environment/environment';

export interface AiSupportResponse {
  answer: string;
}

@Injectable({ providedIn: 'root' })
export class AiSupportService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiEndpoint}/api/support`;

  ask(question: string): Observable<AiSupportResponse> {
    return this.http.post<AiSupportResponse>(`${this.baseUrl}/ask`, {
      question,
    });
  }
}
