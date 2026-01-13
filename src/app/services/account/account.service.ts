import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/app/environment/environment';

@Injectable({ providedIn: 'root' })
export class AccountService {
  private readonly http = inject(HttpClient);

  deleteMe(): Observable<void> {
    return this.http.delete<void>(`${environment.apiEndpoint}/api/account/me`);
  }
}
