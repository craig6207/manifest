import { Component, computed, inject, signal } from '@angular/core';

import {
  IonContent,
  IonHeader,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonItem,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonFooter,
  IonButton,
  IonAlert,
  IonRefresher,
  IonRefresherContent,
  IonSkeletonText,
  IonIcon,
  ToastController,
} from '@ionic/angular/standalone';
import { NavController } from '@ionic/angular';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ToolbarBackComponent } from 'src/app/components/toolbar-back/toolbar-back.component';
import {
  TimesheetAdjustmentCreateRequest,
  TimesheetEligibility,
  TimesheetWeek,
  TimesheetDay,
} from 'src/app/interfaces/timesheets';
import { TimesheetService } from 'src/app/services/timesheet/timesheet.service';
import { TimesheetStore } from 'src/app/+state/timesheet-signal.store';
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

function startOfWeek(d: Date): Date {
  const copy = new Date(d);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function toDateOnlyString(d: Date): string {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const dd = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function dateOnlyToLocalDate(yyyyMMdd: string): Date {
  const [y, m, d] = yyyyMMdd.split('-').map(Number);
  return new Date(
    (y as number) || 0,
    ((m as number) ?? 1) - 1,
    (d as number) || 1,
    0,
    0,
    0,
    0
  );
}

function parseHHMMToISO(
  dateISO: string,
  hhmmStr: string | null
): string | null {
  if (!hhmmStr) return null;
  const [h, m] = hhmmStr.split(':').map(Number);
  const d = new Date(dateISO);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

function isDateOnly(s: string | null | undefined): s is string {
  return !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function to24Hour(hhmm: string, period: 'AM' | 'PM'): string | null {
  const parts = hhmm.split(':');
  let hours = parseInt(parts[0] ?? '', 10);
  let minutes = parseInt(parts[1] ?? '', 10);

  if (isNaN(hours) || isNaN(minutes)) return null;

  if (hours < 0) hours = 0;
  if (hours > 12) hours = 12;

  if (minutes < 0) minutes = 0;
  if (minutes > 59) minutes = 59;

  if (period === 'PM' && hours < 12) {
    hours += 12;
  } else if (period === 'AM' && hours === 12) {
    hours = 0;
  }

  const hStr = hours.toString().padStart(2, '0');
  const mStr = minutes.toString().padStart(2, '0');
  return `${hStr}:${mStr}`;
}

function dateToTimeAndPeriod(ts: string | Date): {
  time: string;
  period: 'AM' | 'PM';
} {
  const d = typeof ts === 'string' ? new Date(ts) : ts;
  const hours24 = d.getHours();
  const minutes = d.getMinutes();

  const period: 'AM' | 'PM' = hours24 >= 12 ? 'PM' : 'AM';
  let hours12 = hours24 % 12;
  if (hours12 === 0) hours12 = 12;

  const time = `${hours12}:${minutes.toString().padStart(2, '0')}`;
  return { time, period };
}

@Component({
  selector: 'app-timesheet-log',
  templateUrl: './timesheet-log.page.html',
  styleUrls: ['./timesheet-log.page.scss'],
  standalone: true,
  imports: [
    IonButton,
    IonFooter,
    IonContent,
    IonHeader,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonItem,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonAlert,
    IonRefresher,
    IonRefresherContent,
    IonSkeletonText,
    IonIcon,
    FormsModule,
    ToolbarBackComponent
],
})
export class TimesheetLogPage {
  private nav = inject(NavController);
  private route = inject(ActivatedRoute);

  mode: 'timer' | 'manual' = 'timer';

  manualStartTime = '';
  manualStartPeriod: 'AM' | 'PM' = 'AM';

  manualEndTime = '';
  manualEndPeriod: 'AM' | 'PM' = 'AM';

  isAlertOpen = false;

  alertInputs = [
    {
      type: 'textarea' as const,
      name: 'reason',
      placeholder: 'Reason (optional)',
      attributes: { maxlength: 512, rows: 4 },
    },
  ];

  alertButtons = [
    {
      text: 'Cancel',
      role: 'cancel' as const,
      handler: () => {},
    },
    {
      text: 'Save',
      handler: (value: { reason?: string }) => {
        const reason = (value?.reason ?? '').trim() || null;
        this.confirmSaveWithReason(reason);
        return true;
      },
    },
  ];

  private jobListingId: number | null = null;
  private workDate: string | null = null;

  backUrl = '/secure/tabs/timesheets';

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

  readonly actionMode = computed<'checkin' | 'checkout' | 'done'>(() => {
    const a = this.active();
    if (!a) return 'done';

    if (a.checkInUtc && a.checkOutUtc) {
      return 'done';
    }

    if (a.canCheckIn) return 'checkin';
    if (a.canCheckOut) return 'checkout';

    return 'done';
  });

  readonly actionDisabled = computed<boolean>(() => {
    const a = this.active();
    const mode = this.actionMode();

    if (!a || mode === 'done') return true;

    return this.busy() || this.loading() || (!a.canCheckIn && !a.canCheckOut);
  });

  readonly busy = signal(false);
  readonly successMsg = signal<string | null>(null);

  constructor() {
    const qp = this.route.snapshot.queryParamMap;
    const jl = Number(qp.get('jobListingId'));
    this.jobListingId = Number.isFinite(jl) ? jl : null;

    const workDateParam = qp.get('workDate');
    this.workDate = isDateOnly(workDateParam) ? workDateParam : null;

    if (Number.isFinite(this.jobListingId)) {
      this.backUrl = `/secure/tabs/timesheets-edit?jobListingId=${this.jobListingId}`;
    }

    this.store.loadToday();

    if (this.jobListingId != null && this.workDate) {
      void this.prefillManualFromExisting();
    }
  }

  onModeChange(ev: CustomEvent) {
    const value = (ev.detail as any).value as 'timer' | 'manual';
    this.mode = value;
  }

  onTimeInput(which: 'start' | 'end', ev: CustomEvent) {
    const target = ev.target as HTMLInputElement | null;
    const raw = (target?.value ?? '').replace(/[^\d:]/g, '');

    const parts = raw.split(':');
    let hours = parseInt(parts[0] ?? '', 10);
    let minutes = parseInt(parts[1] ?? '', 10);

    if (isNaN(hours)) hours = 0;
    if (hours < 0) hours = 0;
    if (hours > 12) hours = 12;

    if (isNaN(minutes)) minutes = 0;
    if (minutes < 0) minutes = 0;
    if (minutes > 59) minutes = 59;

    const value = `${hours}:${minutes.toString().padStart(2, '0')}`;

    if (which === 'start') {
      this.manualStartTime = value;
    } else {
      this.manualEndTime = value;
    }
  }

  openReasonAlert() {
    this.isAlertOpen = true;
  }

  onActionClick() {
    const a = this.active();
    const mode = this.actionMode();

    if (!a || mode === 'done' || this.busy() || this.loading()) {
      return;
    }

    if (mode === 'checkin') {
      void this.onCheckInFancy(a);
    } else if (mode === 'checkout') {
      void this.onCheckOutFancy(a);
    }
  }

  private buildAdjustment(
    reason: string | null
  ): TimesheetAdjustmentCreateRequest | null {
    if (!Number.isFinite(this.jobListingId) || !this.workDate) return null;

    const baseDate = dateOnlyToLocalDate(this.workDate);
    const baseISO = baseDate.toISOString();

    const start24 = to24Hour(
      this.manualStartTime || '0:00',
      this.manualStartPeriod
    );
    const end24 = to24Hour(this.manualEndTime || '0:00', this.manualEndPeriod);

    const inUtc = start24 ? parseHHMMToISO(baseISO, start24) : null;
    let outUtc = end24 ? parseHHMMToISO(baseISO, end24) : null;

    if (inUtc && outUtc && new Date(outUtc) <= new Date(inUtc)) {
      outUtc = null;
    }

    return {
      jobListingId: this.jobListingId as number,
      workDate: this.workDate,
      proposedCheckInUtc: inUtc,
      proposedCheckOutUtc: outUtc,
      reason,
    };
  }

  private async confirmSaveWithReason(reason: string | null) {
    if (!Number.isFinite(this.jobListingId) || !this.workDate) {
      this.isAlertOpen = false;
      this.nav.navigateBack(this.backUrl);
      return;
    }

    const adjustment = this.buildAdjustment(reason);
    if (!adjustment) {
      this.isAlertOpen = false;
      return;
    }

    const workDateObj = dateOnlyToLocalDate(this.workDate);
    const weekStart = startOfWeek(workDateObj);
    const anchorDate = toDateOnlyString(weekStart);

    try {
      await firstValueFrom(
        this.timesheetService.submitWeekEdits(anchorDate, [adjustment])
      );
    } finally {
      this.isAlertOpen = false;
      this.nav.navigateBack(this.backUrl);
    }
  }

  private async prefillManualFromExisting() {
    if (!Number.isFinite(this.jobListingId) || !this.workDate) return;

    try {
      const workDateObj = dateOnlyToLocalDate(this.workDate);
      const weekStart = startOfWeek(workDateObj);
      const anchorDate = toDateOnlyString(weekStart);

      const dto: TimesheetWeek = await firstValueFrom(
        this.timesheetService.getWeek(anchorDate, this.jobListingId as number)
      );

      const day: TimesheetDay | undefined = dto.days.find(
        (d) => d.workDate === this.workDate
      );

      if (!day) return;
      if (day.checkInUtc) {
        const { time, period } = dateToTimeAndPeriod(day.checkInUtc);
        this.manualStartTime = time;
        this.manualStartPeriod = period;
      }

      if (day.checkOutUtc) {
        const { time, period } = dateToTimeAndPeriod(day.checkOutUtc);
        this.manualEndTime = time;
        this.manualEndPeriod = period;
      }
    } catch {
      // Swallow errors quietly – manual form just stays empty if we can't prefill
    }
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
  goToTimesheets() {
    this.nav.back();
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
