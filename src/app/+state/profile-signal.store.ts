import { inject } from '@angular/core';
import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { CandidateProfile } from 'src/app/interfaces/candidate-profile';
import { pipe, switchMap, tap } from 'rxjs';
import { CandidateProfileService } from '../services/candidate-profile/candidate-profile.service';
import { NotificationsService } from '../services/notification/notification.service';
import { tapResponse } from '@ngrx/operators';
import { Preferences } from '@capacitor/preferences';
import { ProfilePicService } from '../services/profile-pic/profile-pic.service';

const AVATAR_PREFS_KEY = 'profile.avatarDataUrl';

export type ProfileState = {
  profile: CandidateProfile | null;
  loading: boolean;
  loaded: boolean;
  error: string;
  unreadNotificationCount: number;
  avatarDataUrl: string | null;
  avatarLoaded: boolean;
};

const initialState: ProfileState = {
  profile: null,
  loading: false,
  loaded: false,
  error: '',
  unreadNotificationCount: 0,
  avatarDataUrl: null,
  avatarLoaded: false,
};

async function blobToDataUrl(blob: Blob): Promise<string> {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read avatar blob'));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(blob);
  });
}

export const ProfileStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods(
    (
      store,
      profileService = inject(CandidateProfileService),
      notificationsService = inject(NotificationsService),
      profilePicService = inject(ProfilePicService)
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

      async persistAvatarToPrefs(dataUrl: string | null): Promise<void> {
        if (dataUrl) {
          await Preferences.set({ key: AVATAR_PREFS_KEY, value: dataUrl });
        } else {
          await Preferences.remove({ key: AVATAR_PREFS_KEY });
        }
      },

      async setAvatarDataUrl(dataUrl: string | null): Promise<void> {
        patchState(store, { avatarDataUrl: dataUrl, avatarLoaded: true });
        await this.persistAvatarToPrefs(dataUrl);
      },

      async loadAvatarFromCacheOnce(): Promise<boolean> {
        try {
          const { value } = await Preferences.get({ key: AVATAR_PREFS_KEY });
          if (value) {
            patchState(store, { avatarDataUrl: value, avatarLoaded: true });
            return true;
          }
        } finally {
          return false;
        }
      },

      async fetchAvatarFromApiOnce(): Promise<void> {
        try {
          const blob = await profilePicService.getMyPhotoBlob().toPromise();
          if (blob && blob.size > 0) {
            const dataUrl = await blobToDataUrl(blob);
            patchState(store, { avatarDataUrl: dataUrl, avatarLoaded: true });
            await this.persistAvatarToPrefs(dataUrl);
          } else {
            patchState(store, { avatarLoaded: true });
          }
        } catch {
          patchState(store, { avatarLoaded: true });
        }
      },

      async ensureAvatarLoaded(): Promise<void> {
        const alreadyLoaded = (store as any).avatarLoaded?.();
        const existingData = (store as any).avatarDataUrl?.();

        if (alreadyLoaded && existingData) return;

        const hadCache = await this.loadAvatarFromCacheOnce();
        if (hadCache) return;

        await this.fetchAvatarFromApiOnce();
      },

      async setAvatarFromBlob(blob: Blob): Promise<void> {
        const dataUrl = await blobToDataUrl(blob);
        await this.setAvatarDataUrl(dataUrl);
      },

      async clearAvatarCache(): Promise<void> {
        patchState(store, { avatarDataUrl: null, avatarLoaded: false });
        await Preferences.remove({ key: AVATAR_PREFS_KEY });
      },
    })
  )
);
