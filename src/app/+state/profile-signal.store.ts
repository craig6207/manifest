import { inject } from '@angular/core';
import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { CandidateProfile } from 'src/app/interfaces/candidate-profile';
import { pipe, switchMap, tap } from 'rxjs';
import { CandidateProfileService } from '../services/candidate-profile/candidate-profile.service';
import { tapResponse } from '@ngrx/operators';
import { NotificationsService } from '../services/notification/notification.service';

export type ProfileState = {
  profile: CandidateProfile | null;
  loading: boolean;
  loaded: boolean;
  error: string;
  unreadNotificationCount: number;
};

const initialState: ProfileState = {
  profile: null,
  loading: false,
  loaded: false,
  error: '',
  unreadNotificationCount: 0,
};

export const ProfileStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods(
    (
      store,
      profileService = inject(CandidateProfileService),
      notificationsService = inject(NotificationsService)
    ) => ({
      setProfile(profile: CandidateProfile): void {
        patchState(store, { profile, loaded: true, loading: false, error: '' });
      },
      setUnreadNotificationCount(count: number): void {
        patchState(store, {
          unreadNotificationCount: Math.max(0, Number(count) || 0),
        });
      },

      loadUnreadNotificationCount: rxMethod<void>(
        pipe(
          switchMap(() =>
            notificationsService.getUnreadCount().pipe(
              tapResponse({
                next: (count) =>
                  patchState(store, {
                    unreadNotificationCount: Math.max(0, Number(count) || 0),
                  }),
                error: () => patchState(store, { unreadNotificationCount: 0 }),
              })
            )
          )
        )
      ),

      loadProfile: rxMethod<void>(
        pipe(
          tap(() => patchState(store, { loading: true, error: '' })),
          switchMap(() =>
            profileService.getProfile().pipe(
              tapResponse({
                next: (profile) =>
                  patchState(store, {
                    profile,
                    loaded: true,
                    loading: false,
                    error: '',
                  }),
                error: () =>
                  patchState(store, {
                    profile: null,
                    loaded: false,
                    loading: false,
                    error: 'Failed to load your details. Please try again.',
                  }),
              })
            )
          )
        )
      ),

      saveProfile: rxMethod<CandidateProfile>(
        pipe(
          tap(() => patchState(store, { loading: true, error: '' })),
          switchMap((payload) =>
            profileService.saveProfile(payload).pipe(
              tapResponse({
                next: (profile) =>
                  patchState(store, {
                    profile,
                    loaded: true,
                    loading: false,
                    error: '',
                  }),
                error: () =>
                  patchState(store, {
                    loading: false,
                    error: 'Failed to save your details. Please try again.',
                  }),
              })
            )
          )
        )
      ),
      updateProfile: rxMethod<CandidateProfile>(
        pipe(
          tap(() => patchState(store, { loading: true, error: '' })),
          switchMap((payload) =>
            profileService.updateProfile(payload).pipe(
              tapResponse({
                next: (profile) =>
                  patchState(store, {
                    profile,
                    loaded: true,
                    loading: false,
                    error: '',
                  }),
                error: () =>
                  patchState(store, {
                    loading: false,
                    error: 'Failed to update your details. Please try again.',
                  }),
              })
            )
          )
        )
      ),
    })
  )
);
