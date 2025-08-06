import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';

export type RegisterState = {
  email: string;
  password: string;
};

const initialState: RegisterState = {
  email: '',
  password: '',
};

export const RegisterStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store) => ({
    setEmailPassword(email: string, password: string): void {
      patchState(store, { email, password });
    },
  }))
);
