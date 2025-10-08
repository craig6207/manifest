import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonIcon,
  IonRefresher,
  IonRefresherContent,
  IonSkeletonText,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  pinOutline,
  timeOutline,
  logInOutline,
  logOutOutline,
  refreshOutline,
  alertCircleOutline,
  checkmarkCircleOutline,
  informationCircleOutline,
} from 'ionicons/icons';
import { TimesheetStore } from 'src/app/+state/timesheet-signal.store';
import { TimesheetEligibility } from 'src/app/interfaces/timesheets';
import { TimesheetService } from 'src/app/services/timesheet/timesheet.service';

addIcons({
  pinOutline,
  timeOutline,
  logInOutline,
  logOutOutline,
  refreshOutline,
  alertCircleOutline,
  checkmarkCircleOutline,
  informationCircleOutline,
});

@Component({
  selector: 'app-check-in-out',
  templateUrl: './check-in-out.page.html',
  styleUrls: ['./check-in-out.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    IonIcon,
    IonRefresher,
    IonRefresherContent,
    IonSkeletonText,
  ],
})
export class CheckInOutPage {
  private readonly store = inject(TimesheetStore);
  private readonly timesheetService = inject(TimesheetService);
  private readonly toast = inject(ToastController);

  readonly loading = this.store.isLoading;
  readonly error = this.store.errorMessage;

  private readonly rawToday = this.store.today as unknown as () =>
    | TimesheetEligibility
    | TimesheetEligibility[]
    | null;

  readonly active = computed<TimesheetEligibility | null>(() => {
    const v = this.rawToday?.();
    if (!v) return null;
    return Array.isArray(v) ? (v.length ? v[0] : null) : v;
  });

  readonly hasActionAvailable = computed<boolean>(() => {
    const a = this.active();
    return !!a && (a.canCheckIn || a.canCheckOut);
  });
  readonly hasAnyToday = computed<boolean>(() => !!this.active());
  readonly titleText = computed(() => {
    const a = this.active();
    if (!a) return 'Check in / out';
    if (a.canCheckIn) return 'Check in';
    if (a.canCheckOut) return 'Check out';
    return 'Check in / out';
  });

  readonly busy = signal(false);
  readonly successMsg = signal<string | null>(null);

  constructor() {
    this.store.loadToday();
  }

  dismissSuccess() {
    this.successMsg.set(null);
  }

  toLocalTime(ts?: string | Date | null): string | null {
    if (!ts) return null;
    const d = typeof ts === 'string' ? new Date(ts) : ts;
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  toLocalDate(d: string | Date): string {
    const x = typeof d === 'string' ? new Date(d) : d;
    return x.toLocaleDateString([], {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  load() {
    if (this.loading() || this.busy()) return;
    this.store.refresh();
  }

  async pullRefresh(ev: CustomEvent) {
    this.store.refresh();
    (ev.target as HTMLIonRefresherElement).complete();
  }

  async onCheckInFancy(row: TimesheetEligibility) {
    if (!row?.canCheckIn || this.busy()) return;
    this.busy.set(true);

    this.timesheetService
      .checkIn({
        jobCandidateId: row.jobCandidateId,
        clientTimestampUtc: new Date().toISOString(),
      })
      .subscribe({
        next: async () => {
          this.busy.set(false);
          this.store.refresh();
          this.successMsg.set("Thanks — you're checked in!");
        },
        error: async (err) => {
          this.busy.set(false);
          await this.toastMsg(err?.error?.detail || 'Check-in failed');
        },
      });
  }

  async onCheckOutFancy(row: TimesheetEligibility) {
    if (!row?.canCheckOut || this.busy() || !row.sessionId) return;
    this.busy.set(true);

    this.timesheetService
      .checkOut({
        sessionId: row.sessionId,
        clientTimestampUtc: new Date().toISOString(),
      })
      .subscribe({
        next: async () => {
          this.busy.set(false);
          this.store.refresh();
          this.successMsg.set("All set — you're checked out");
        },
        error: async (err) => {
          this.busy.set(false);
          await this.toastMsg(err?.error?.detail || 'Check-out failed');
        },
      });
  }

  async onCheckIn(row: TimesheetEligibility) {
    if (!row?.canCheckIn || this.busy()) return;
    this.busy.set(true);

    this.timesheetService
      .checkIn({
        jobCandidateId: row.jobCandidateId,
        clientTimestampUtc: new Date().toISOString(),
      })
      .subscribe({
        next: async () => {
          this.busy.set(false);
          this.store.refresh();
          await this.toastMsg('Checked in — have a great shift!');
        },
        error: async (err) => {
          this.busy.set(false);
          await this.toastMsg(err?.error?.detail || 'Check-in failed');
        },
      });
  }

  async onCheckOut(row: TimesheetEligibility) {
    if (!row?.canCheckOut || this.busy() || !row.sessionId) return;
    this.busy.set(true);

    this.timesheetService
      .checkOut({
        sessionId: row.sessionId,
        clientTimestampUtc: new Date().toISOString(),
      })
      .subscribe({
        next: async () => {
          this.busy.set(false);
          this.store.refresh();
          await this.toastMsg('Checked out — nice work today!');
        },
        error: async (err) => {
          this.busy.set(false);
          await this.toastMsg(err?.error?.detail || 'Check-out failed');
        },
      });
  }

  private async toastMsg(message: string) {
    const t = await this.toast.create({
      message,
      duration: 2200,
      position: 'bottom',
      color: 'success',
    });
    await t.present();
  }
}
