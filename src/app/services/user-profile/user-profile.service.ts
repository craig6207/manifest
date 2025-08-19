import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/app/environment/environment';
import { UserProfile } from 'src/app/interfaces/user-profile';

@Injectable({
  providedIn: 'root',
})
export class UserProfileService {
  private http = inject(HttpClient);

  saveProfile(profile: UserProfile): Observable<any> {
    return this.http.post<any>(
      `${environment.apiEndpoint}/api/userprofile`,
      profile
    );
  }

  getProfile(): Observable<UserProfile> {
    return this.http.get<UserProfile>(
      `${environment.apiEndpoint}/api/userprofile/me`
    );
  }

  updateProfile(profile: UserProfile): Observable<UserProfile> {
    return this.http.put<UserProfile>(
      `${environment.apiEndpoint}/api/userprofile/me`,
      profile
    );
  }
}
