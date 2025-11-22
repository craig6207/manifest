import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import {
  IonHeader,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonChip,
  IonBadge,
  IonButton,
  IonIcon,
  IonRefresher,
  IonRefresherContent,
  IonSkeletonText,
} from '@ionic/angular/standalone';
import { NavController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  timeOutline,
  arrowBackOutline,
  arrowForwardOutline,
  addOutline,
} from 'ionicons/icons';
import { firstValueFrom } from 'rxjs';
import { TimesheetService } from 'src/app/services/timesheet/timesheet.service';
import {
  TimesheetWeek as TimesheetWeekDto,
  TimesheetDay as TimesheetDayDto,
  JobAssignmentSummary,
} from 'src/app/interfaces/timesheets';
import { ActivatedRoute } from '@angular/router';
import { ToolbarBackComponent } from 'src/app/components/toolbar-back/toolbar-back.component';

type WeekStatus = 'Open' | 'Submitted' | 'Approved';

interface TimesheetEntry {
  checkIn: string;
  checkOut: string | null;
}

interface TimesheetDayVM {
  dateISO: string;
  entries: TimesheetEntry[];
}

interface TimesheetWeekVM {
  weekStartISO: string;
  weekEndISO: string;
  status: WeekStatus;
  days: TimesheetDayVM[];
}

function startOfWeek(d: Date): Date {
  const copy = new Date(d);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function endOfWeek(d: Date): Date {
  const s = startOfWeek(d);
  const e = new Date(s);
  e.setDate(s.getDate() + 6);
  e.setHours(23, 59, 59, 999);
  return e;
}

function addDays(d: Date, days: number): Date {
  const c = new Date(d);
  c.setDate(c.getDate() + days);
  return c;
}

function toISODateMidnight(d: Date): string {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c.toISOString();
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

function formatDayLabel(d: Date): {
  weekdayShort: string;
  displayDate: string;
} {
  const weekdayShort = d.toLocaleDateString(undefined, { weekday: 'short' });
  const displayDate = d.toLocaleDateString(undefined, {
    day: '2-digit',
  });
  return { weekdayShort, displayDate };
}

function hoursBetween(ci: Date, co: Date | null): number {
  if (!co) return 0;
  const ms = co.getTime() - ci.getTime();
  return Math.max(0, ms / (1000 * 60 * 60));
}

function applyLunchDeduction(hours: number): number {
  return hours > 0 ? Math.max(0, hours - 0.5) : 0;
}

function isDateOnly(s: string | null | undefined): s is string {
  return !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function formatHoursToHHmm(hours: number): string {
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}:${m.toString().padStart(2, '0')}`;
}

@Component({
  selector: 'app-timesheets-edit',
  imports: [
    IonSkeletonText,
    IonHeader,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonChip,
    IonBadge,
    IonButton,
    IonIcon,
    IonRefresher,
    IonRefresherContent,
    ToolbarBackComponent,
  ],
  templateUrl: './timesheets-edit.page.html',
  styleUrls: ['timesheets-edit.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ion-page' },
})
export class TimesheetsEditPage {
  private readonly svc = inject(TimesheetService);
  private readonly route = inject(ActivatedRoute);
  private readonly nav = inject(NavController);

  readonly jobListingId = signal<number | null>(null);
  readonly loading = signal(true);
  readonly selectedDate = signal(new Date());
  readonly week = signal<TimesheetWeekVM | null>(null);
  readonly minDateISO = signal<string | null>(null);
  readonly maxDateISO = signal<string | null>(null);

  readonly weekStart = computed(() => startOfWeek(this.selectedDate()));
  readonly weekEnd = computed(() => endOfWeek(this.selectedDate()));
  readonly weekStatus = computed<WeekStatus>(
    () => (this.week()?.status ?? 'Open') as WeekStatus
  );

  readonly days = computed(() => {
    const w = this.week();
    if (!w) return [];
    return w.days.map((d) => {
      const date = new Date(d.dateISO);
      const { weekdayShort, displayDate } = formatDayLabel(date);

      const entries = d.entries.map((e) => {
        const ci = new Date(e.checkIn);
        const co = e.checkOut ? new Date(e.checkOut) : null;
        return {
          inLabel: ci.toLocaleTimeString(undefined, {
            hour: '2-digit',
            minute: '2-digit',
          }),
          outLabel: co
            ? co.toLocaleTimeString(undefined, {
                hour: '2-digit',
                minute: '2-digit',
              })
            : null,
          checkIn: e.checkIn,
          checkOut: e.checkOut,
        };
      });

      const rawTotal = d.entries.reduce((acc, e) => {
        const ci = new Date(e.checkIn);
        const co = e.checkOut ? new Date(e.checkOut) : null;
        return acc + hoursBetween(ci, co);
      }, 0);

      const total = applyLunchDeduction(rawTotal);
      const totalHoursLabel = total > 0 ? formatHoursToHHmm(total) : '';

      return {
        dateISO: d.dateISO,
        weekdayShort,
        displayDate,
        entries,
        totalHoursLabel,
      };
    });
  });

  weekRangeLabel = computed(() => {
    const s = this.weekStart();
    const e = this.weekEnd();
    const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
    const left = s.toLocaleDateString(undefined, opts);
    const right = e.toLocaleDateString(undefined, opts);
    return `${left} — ${right}`;
  });

  constructor() {
    addIcons({
      timeOutline,
      arrowBackOutline,
      arrowForwardOutline,
      addOutline,
    });

    this.route.queryParamMap.subscribe((qp) => {
      const dateParam = qp.get('date');
      if (isDateOnly(dateParam)) {
        this.selectedDate.set(dateOnlyToLocalDate(dateParam!));
      } else {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        this.selectedDate.set(today);
      }

      const jl = Number(qp.get('jobListingId'));
      this.jobListingId.set(Number.isFinite(jl) ? jl : null);

      this.initBounds();
    });

    effect(() => {
      const startISO = toISODateMidnight(this.weekStart());
      const jl = this.jobListingId();
      this.loadWeek(startISO, jl);
    });
  }

  private async initBounds(): Promise<void> {
    const jl = this.jobListingId();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let minDate: Date | null = null;
    let maxDate: Date | null = null;

    try {
      const [current, history] = await Promise.all([
        firstValueFrom(this.svc.getCurrentJob()),
        firstValueFrom(this.svc.getHistoryJobs()),
      ]);

      const currentMatch =
        current && jl != null && current.jobListingId === jl
          ? (current as JobAssignmentSummary)
          : null;

      const historyMatch =
        jl != null && Array.isArray(history)
          ? (history as JobAssignmentSummary[]).find(
              (h) => h.jobListingId === jl
            )
          : undefined;

      if (currentMatch) {
        const start = dateOnlyToLocalDate(currentMatch.startDate);
        const endMaybe = currentMatch.endDate
          ? dateOnlyToLocalDate(currentMatch.endDate)
          : null;
        const cap = endMaybe && endMaybe < today ? endMaybe : today;

        minDate = start;
        maxDate = cap;
      } else if (historyMatch) {
        const start = dateOnlyToLocalDate(historyMatch.startDate);
        const end = historyMatch.endDate
          ? dateOnlyToLocalDate(historyMatch.endDate)
          : today;
        minDate = start;
        maxDate = end;
      } else if (current) {
        const start = dateOnlyToLocalDate(current.startDate);
        const endMaybe = current.endDate
          ? dateOnlyToLocalDate(current.endDate)
          : null;
        const cap = endMaybe && endMaybe < today ? endMaybe : today;

        minDate = start;
        maxDate = cap;
      } else {
        minDate = new Date(today);
        maxDate = new Date(today);
      }
    } catch {
      minDate = new Date(today);
      maxDate = new Date(today);
    }

    this.minDateISO.set(toDateOnlyString(minDate!));
    this.maxDateISO.set(toDateOnlyString(maxDate!));

    this.selectedDate.set(this.clampToBounds(this.selectedDate()));
  }

  private clampToBounds(d: Date): Date {
    const minStr = this.minDateISO();
    const maxStr = this.maxDateISO();

    const localMidnight = new Date(d);
    localMidnight.setHours(0, 0, 0, 0);

    if (minStr) {
      const min = dateOnlyToLocalDate(minStr);
      if (localMidnight < min) return min;
    }
    if (maxStr) {
      const max = dateOnlyToLocalDate(maxStr);
      if (localMidnight > max) return max;
    }
    return localMidnight;
  }

  private async loadWeek(weekStartISO: string, jobListingId: number | null) {
    this.loading.set(true);
    try {
      const dateOnly = toDateOnlyString(new Date(weekStartISO));
      const dto: TimesheetWeekDto = await firstValueFrom(
        this.svc.getWeek(dateOnly, jobListingId ?? undefined)
      );

      const mapped: TimesheetWeekVM = {
        weekStartISO: dateOnlyToLocalDate(dto.weekStart).toISOString(),
        weekEndISO: dateOnlyToLocalDate(dto.weekEnd).toISOString(),
        status: (dto.weekStatus ?? 'Open') as WeekStatus,
        days: dto.days.map((d: TimesheetDayDto) => {
          const baseDateISO = dateOnlyToLocalDate(d.workDate).toISOString();
          const entries: TimesheetEntry[] =
            d.checkInUtc || d.checkOutUtc
              ? [
                  {
                    checkIn: d.checkInUtc ?? baseDateISO,
                    checkOut: d.checkOutUtc,
                  },
                ]
              : [];
          return { dateISO: baseDateISO, entries };
        }),
      };

      this.week.set(mapped);
    } finally {
      this.loading.set(false);
    }
  }

  goPrevWeek() {
    const prev = addDays(this.weekStart(), -1);
    this.selectedDate.set(this.clampToBounds(prev));
  }

  goNextWeek() {
    const next = addDays(this.weekEnd(), 1);
    this.selectedDate.set(this.clampToBounds(next));
  }

  onRefresh(ev: CustomEvent) {
    const startISO = toISODateMidnight(this.weekStart());
    this.loadWeek(startISO, this.jobListingId()).then(() =>
      (ev.detail as any).complete()
    );
  }

  onDayCardClick(d: {
    dateISO: string;
    entries: TimesheetEntry[];
    totalHoursLabel?: string;
  }) {
    if (d.entries.length === 0 && this.weekStatus() === 'Open') {
      this.logTimeForDay(d.dateISO);
    }
  }

  private logTimeForDay(dateISO: string) {
    const jl = this.jobListingId();
    if (!Number.isFinite(jl)) return;
    const workDate = toDateOnlyString(new Date(dateISO));
    this.nav.navigateForward(
      `/secure/tabs/timesheets-log?jobListingId=${jl}&workDate=${workDate}`
    );
  }
}
