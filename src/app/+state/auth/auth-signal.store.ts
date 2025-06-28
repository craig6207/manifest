import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { MsalService, MsalBroadcastService } from '@azure/msal-angular';
import {
  EventMessage,
  EventType,
  AuthenticationResult,
} from '@azure/msal-browser';
import { filter } from 'rxjs';
import { ClientStore } from './client-signal.store';

export type AuthState = {
  isAuthenticated: boolean;
  userData: any | null;
  registrationComplete: boolean;
};

const initialState: AuthState = {
  isAuthenticated: false,
  userData: null,
  registrationComplete: false,
};

export const AuthStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods(
    (
      store,
      msalService = inject(MsalService),
      msalBroadcastService = inject(MsalBroadcastService),
      router = inject(Router),
      clientStore = inject(ClientStore)
    ) => ({
      initialize() {
        msalBroadcastService.msalSubject$
          .pipe(
            filter(
              (msg: EventMessage) => msg.eventType === EventType.LOGIN_SUCCESS
            )
          )
          .subscribe((msg: EventMessage) => {
            const authResult = msg.payload as AuthenticationResult;
            msalService.instance.setActiveAccount(authResult.account);
            patchState(store, {
              isAuthenticated: true,
              userData: authResult.account,
            });
            if (!clientStore.profileLoaded()) {
              clientStore.loadProfile();
            }
            if (
              store
                .userData()
                .idTokenClaims.tfp.toLowerCase()
                .includes('sign_up') &&
              !store.registrationComplete()
            ) {
              const registrationRole = localStorage.getItem('role');

              if (registrationRole === 'candidate') {
                router.navigate(['/register/candidate-registration']);
              } else {
                router.navigate(['/register/client-registration']);
              }
            }
          });

        msalBroadcastService.msalSubject$
          .pipe(
            filter(
              (msg: EventMessage) => msg.eventType === EventType.LOGOUT_SUCCESS
            )
          )
          .subscribe(() => {
            patchState(store, {
              isAuthenticated: false,
              userData: null,
              registrationComplete: false,
            });
            router.navigate(['/home']);
          });

        let account = msalService.instance.getActiveAccount();

        if (!account) {
          const allAccounts = msalService.instance.getAllAccounts();
          if (allAccounts.length > 0) {
            account = allAccounts[0];
            msalService.instance.setActiveAccount(account);
          }
        }

        if (account) {
          patchState(store, {
            isAuthenticated: true,
            userData: account,
          });
        } else {
          patchState(store, {
            isAuthenticated: false,
            userData: null,
          });
        }
      },

      setRegistrationComplete(registrationComplete: boolean): void {
        patchState(store, { registrationComplete });
      },

      logout() {
        msalService.logoutRedirect({
          postLogoutRedirectUri: '/',
        });
      },
    })
  )
);
