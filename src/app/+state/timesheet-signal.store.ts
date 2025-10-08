import { computed, inject } from '@angular/core';
import {
  signalStore,
  withState,
  withComputed,
  withMethods,
  patchState,
} from '@ngrx/signals';
import { TimesheetService } from '../services/timesheet/timesheet.service';
import { TimesheetEligibility } from '../interfaces/timesheets';

type TimesheetState = {
  loading: boolean;
  error: string | null;
  today: TimesheetEligibility | null;
};

const initialState: TimesheetState = {
  loading: false,
  error: null,
  today: null,
};

export const TimesheetStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed(({ today, loading, error }) => ({
    isLoading: computed(() => loading()),
    errorMessage: computed(() => error()),
    hasAnyToday: computed(() => today() !== null),
    hasActionAvailable: computed(() => {
      const t = today();
      return !!t && (t.canCheckIn || t.canCheckOut);
    }),
  })),

  withMethods((store, timesheetService = inject(TimesheetService)) => ({
    loadToday() {
      if (store.loading()) return;
      patchState(store, { loading: true, error: null });

      timesheetService.getTodayEligibility().subscribe({
        next: (item) => {
          patchState(store, { today: item ?? null, loading: false });
        },
        error: (err) => {
          const msg =
            err?.error?.detail ||
            err?.error?.title ||
            err?.message ||
            'Failed to load eligibility';
          patchState(store, { error: msg, loading: false, today: null });
        },
      });
    },

    refresh() {
      patchState(store, { loading: false });
      this.loadToday();
    },

    applyCheckInLocal(jobCandidateId: string) {
      const t = store.today();
      if (!t || t.jobCandidateId !== jobCandidateId) return;
      patchState(store, {
        today: {
          ...t,
          canCheckIn: false,
          canCheckOut: true,
        },
      });
    },

    applyCheckOutLocal(sessionId: string) {
      const t = store.today();
      if (!t || t.sessionId !== sessionId) return;
      patchState(store, {
        today: {
          ...t,
          canCheckOut: false,
        },
      });
    },
  }))
);
