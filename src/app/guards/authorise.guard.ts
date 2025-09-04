import { inject } from '@angular/core';
import { CanActivateFn, CanMatchFn, Router, UrlTree } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { ProfileStore } from '../+state/profile-signal.store';
import { CandidateProfileService } from '../services/candidate-profile/candidate-profile.service';

function runAuthCheck(redirectTo: string) {
  const router = inject(Router);
  const profileService = inject(CandidateProfileService);
  const profileStore = inject(ProfileStore);

  const cached = profileStore.profile();
  if (cached) {
    return true;
  }

  return profileService.getProfile().pipe(
    map((profile) => {
      if (!profile) {
        return router.createUrlTree(['/profile-setup'], {
          queryParams: { redirectTo },
        });
      }
      profileStore.setProfile(profile);
      return true as const;
    }),
    catchError((err) => {
      const s = err?.status ?? 0;

      if (s === 404) {
        return of(
          router.createUrlTree(['/profile-setup'], {
            queryParams: { redirectTo },
          })
        );
      }

      if (s === 401 || s === 403) {
        return of(
          router.createUrlTree(['/login'], { queryParams: { redirectTo } })
        );
      }
      return of(
        router.createUrlTree(['/profile-setup'], {
          queryParams: { redirectTo },
        })
      );
    })
  );
}

export const authoriseGuard: CanActivateFn = (_route, state) =>
  runAuthCheck(state.url);

export const authoriseCanMatch: CanMatchFn = (_route, segments) =>
  runAuthCheck('/' + segments.map((s) => s.path).join('/'));
