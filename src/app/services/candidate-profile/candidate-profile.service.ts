import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/app/environment/environment';
import { CandidateProfile } from 'src/app/interfaces/candidate-profile';

@Injectable({
  providedIn: 'root',
})
export class CandidateProfileService {
  private http = inject(HttpClient);

  saveProfile(profile: CandidateProfile): Observable<any> {
    return this.http.post<any>(
      `${environment.apiEndpoint}/api/candidateprofile`,
      profile
    );
  }

  getProfile(): Observable<CandidateProfile> {
    return this.http.get<CandidateProfile>(
      `${environment.apiEndpoint}/api/candidateprofile/me`
    );
  }

  updateProfile(profile: CandidateProfile): Observable<CandidateProfile> {
    return this.http.put<CandidateProfile>(
      `${environment.apiEndpoint}/api/candidateprofile/me`,
      profile
    );
  }
}
