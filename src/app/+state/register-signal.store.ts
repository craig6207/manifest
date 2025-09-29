import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';

export type RegisterState = {
  email: string;
  password: string;
  phoneNumber: string;
  userId: number;
};

const initialState: RegisterState = {
  email: '',
  password: '',
  phoneNumber: '',
  userId: 0,
};

export const RegisterStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store) => ({
    setEmailPasswordPhone(
      email: string,
      password: string,
      phoneNumber: string
    ): void {
      patchState(store, { email, password, phoneNumber });
    },
    setUserId(userId: number): void {
      patchState(store, { userId });
    },
  }))
);
