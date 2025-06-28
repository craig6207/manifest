import { inject } from '@angular/core';
import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { tapResponse } from '@ngrx/operators';
import { switchMap } from 'rxjs';
import { Profile } from '../interfaces/recruit.interface';
import { ClientService } from '../services/client.service';
import { HttpErrorResponse } from '@angular/common/http';

export type ClientState = {
  profile: Profile;
  profileLoaded: boolean;
  isLoading: boolean;
  error?: string;
};

const initialState: ClientState = {
  profile: {
    id: 0,
    profileType: '',
    companyNumber: '',
    companyName: '',
    phone: '',
    email: '',
    firstName: '',
    surname: '',
    profileApproval: false,
    location: '',
    trade: '',
    tradeSubCategory: [],
  },
  profileLoaded: false,
  isLoading: false,
};

export const ClientStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store, clientService = inject(ClientService)) => ({
    loadProfile: rxMethod<void>((input$) =>
      input$.pipe(
        tapResponse({
          next: () => patchState(store, { isLoading: true }),
          error: () => patchState(store, { isLoading: false }),
        }),
        switchMap(() =>
          clientService.getProfile().pipe(
            tapResponse({
              next: (profile) =>
                patchState(store, {
                  profile,
                  isLoading: false,
                  profileLoaded: true,
                }),
              error: (error: HttpErrorResponse) => {
                patchState(store, { isLoading: false, error: error.error });
              },
            })
          )
        )
      )
    ),
    updateProfile: rxMethod<{ profile: Profile; id: number }>((input$) =>
      input$.pipe(
        tapResponse({
          next: () => patchState(store, { isLoading: true }),
          error: () => patchState(store, { isLoading: false }),
        }),
        switchMap(({ profile, id }) =>
          clientService.updateProfile(profile, id).pipe(
            tapResponse({
              next: (updated) =>
                patchState(store, {
                  profile: updated,
                  isLoading: false,
                  profileLoaded: true,
                }),
              error: (err: HttpErrorResponse) =>
                patchState(store, { isLoading: false, error: err.error }),
            })
          )
        )
      )
    ),
    setProfile(profile: Profile): void {
      patchState(store, { profile });
    },
    setLoading(isLoading: boolean): void {
      patchState(store, { isLoading });
    },
  }))
);
