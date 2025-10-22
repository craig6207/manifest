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
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonNote,
  IonChip,
  IonBadge,
  IonButton,
  IonIcon,
  IonRefresher,
  IonRefresherContent,
  IonDatetime,
  IonDatetimeButton,
  IonModal,
  IonInput,
  IonButtons,
  IonBackButton,
  IonAlert,
  IonSkeletonText,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  chevronBackOutline,
  chevronForwardOutline,
  timeOutline,
  createOutline,
  closeOutline,
  saveOutline,
  checkmarkDoneOutline,
  addOutline,
} from 'ionicons/icons';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
} from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { TimesheetService } from 'src/app/services/timesheet/timesheet.service';
import {
  TimesheetWeek as TimesheetWeekDto,
  TimesheetDay as TimesheetDayDto,
  TimesheetAdjustmentCreateRequest,
  JobAssignmentSummary,
} from 'src/app/interfaces/timesheets';
import { ActivatedRoute } from '@angular/router';

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
  const diff = day === 0 ? -6 : 1 - day; // Monday start
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
    month: 'short',
  });
  return { weekdayShort, displayDate };
}
function hhmm(date: Date | null): string | null {
  if (!date) return null;
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
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
    IonAlert,
    IonBackButton,
    IonButtons,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonNote,
    IonChip,
    IonBadge,
    IonButton,
    IonIcon,
    IonRefresher,
    IonRefresherContent,
    IonDatetime,
    IonDatetimeButton,
    IonModal,
    IonInput,
    ReactiveFormsModule,
  ],
  templateUrl: './timesheets-edit.page.html',
  styleUrls: ['timesheets-edit.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ion-page' },
})
export class TimesheetsEditPage {
  private readonly fb = inject(FormBuilder);
  private readonly svc = inject(TimesheetService);
  private readonly route = inject(ActivatedRoute);
  readonly jobListingId = signal<number | null>(null);
  readonly loading = signal(true);
  readonly editing = signal(false);
  readonly selectedDate = signal(new Date());
  readonly week = signal<TimesheetWeekVM | null>(null);
  readonly baselineWeek = signal<TimesheetWeekVM | null>(null);
  readonly isAlertOpen = signal(false);
  readonly minDateISO = signal<string | null>(null);
  readonly maxDateISO = signal<string | null>(null);

  readonly weekStart = computed(() => startOfWeek(this.selectedDate()));
  readonly weekEnd = computed(() => endOfWeek(this.selectedDate()));
  readonly selectedDateISO = computed(() =>
    toDateOnlyString(this.selectedDate())
  );
  readonly weekStatus = computed<WeekStatus>(
    () => (this.week()?.status ?? 'Open') as WeekStatus
  );
  readonly canEditWeek = computed(() => this.weekStatus() !== 'Approved');

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

  readonly form: FormGroup = this.fb.group({
    weekStartISO: new FormControl<string>(''),
    weekEndISO: new FormControl<string>(''),
    days: this.fb.array<FormGroup>([]),
  });

  readonly alertInputs = [
    {
      type: 'textarea' as const,
      name: 'reason',
      placeholder: 'Reason (optional)',
      attributes: { maxlength: 512, rows: 4 },
    },
  ];
  readonly alertButtons = [
    { text: 'Cancel', role: 'cancel', handler: () => {} },
    {
      text: 'Submit',
      handler: (value: { reason?: string }) => {
        const reason = (value?.reason ?? '').trim() || null;
        this.confirmSubmitWithReason(reason);
        return true;
      },
    },
  ];

  constructor() {
    addIcons({
      chevronBackOutline,
      chevronForwardOutline,
      timeOutline,
      createOutline,
      closeOutline,
      saveOutline,
      checkmarkDoneOutline,
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

  openReasonAlert() {
    this.isAlertOpen.set(true);
  }

  dayControls() {
    return (this.form.get('days') as FormArray<FormGroup>).controls;
  }
  entryControls(dayCtrl: FormGroup) {
    return (dayCtrl.get('entries') as FormArray<FormGroup>).controls;
  }
  entryCtrlCount(dayCtrl: FormGroup) {
    return (dayCtrl.get('entries') as FormArray<FormGroup>).length;
  }

  private buildForm(w: TimesheetWeekVM) {
    this.form.reset();

    const dayGroups = w.days.map((day) => {
      const date = new Date(day.dateISO);
      const { weekdayShort, displayDate } = formatDayLabel(date);

      const entries =
        day.entries.length > 0
          ? day.entries
          : [
              {
                checkIn: null as unknown as string,
                checkOut: null as string | null,
              },
            ];

      const entriesFA = this.fb.array<FormGroup>(
        entries.map((e) => {
          const ci = e.checkIn ? new Date(e.checkIn) : null;
          const co = e.checkOut ? new Date(e.checkOut) : null;
          return this.fb.group({
            inLocal: new FormControl<string>(ci ? hhmm(ci) ?? '' : ''),
            outLocal: new FormControl<string>(co ? hhmm(co) ?? '' : ''),
          });
        })
      );

      return this.fb.group({
        dateISO: new FormControl(day.dateISO),
        weekdayShort: new FormControl(weekdayShort),
        displayDate: new FormControl(displayDate),
        entries: entriesFA,
      });
    });

    this.form.setControl(
      'weekStartISO',
      new FormControl<string>(w.weekStartISO)
    );
    this.form.setControl('weekEndISO', new FormControl<string>(w.weekEndISO));
    this.form.setControl('days', this.fb.array<FormGroup>(dayGroups));
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
      this.baselineWeek.set(mapped);
      this.buildForm(mapped);
    } finally {
      this.loading.set(false);
      this.editing.set(false);
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
  onDatePicked(ev: CustomEvent) {
    const value = (ev.detail as unknown as { value: string }).value;
    if (!value) return;
    const picked = dateOnlyToLocalDate(value.substring(0, 10));
    this.selectedDate.set(this.clampToBounds(picked));
  }

  onRefresh(ev: CustomEvent) {
    const startISO = toISODateMidnight(this.weekStart());
    this.loadWeek(startISO, this.jobListingId()).then(() =>
      (ev.detail as any).complete()
    );
  }

  weekRangeLabel = computed(() => {
    const s = this.weekStart();
    const e = this.weekEnd();
    const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
    const left = s.toLocaleDateString(undefined, opts);
    const right = e.toLocaleDateString(undefined, opts);
    return `${left} — ${right}`;
  });

  startEdit() {
    if (this.canEditWeek()) this.editing.set(true);
  }
  cancelEdit() {
    const w = this.week();
    if (w) this.buildForm(w);
    this.editing.set(false);
  }

  addEntry(dayCtrl: FormGroup) {
    const fa = dayCtrl.get('entries') as FormArray<FormGroup>;
    fa.push(
      this.fb.group({
        inLocal: new FormControl<string>(''),
        outLocal: new FormControl<string>(''),
      })
    );
  }
  removeEntry(dayCtrl: FormGroup, idx: number) {
    const fa = dayCtrl.get('entries') as FormArray<FormGroup>;
    if (fa.length > 1) fa.removeAt(idx);
  }
  onTimeChange(
    entryCtrl: FormGroup,
    key: 'inLocal' | 'outLocal',
    value: string
  ) {
    (entryCtrl.get(key) as FormControl<string>).setValue(value ?? '');
  }

  async confirmSubmitWithReason(reason: string | null) {
    const jl = this.jobListingId();
    if (!Number.isFinite(jl)) return;

    const anchorDate = toDateOnlyString(this.weekStart());
    const edits = this.buildWeekEdits(jl!, reason);

    if (edits.length === 0) {
      this.editing.set(false);
      this.isAlertOpen.set(false);
      return;
    }

    this.loading.set(true);
    try {
      await firstValueFrom(this.svc.submitWeekEdits(anchorDate, edits));
      await this.loadWeek(toISODateMidnight(this.weekStart()), jl!);
      this.editing.set(false);
    } finally {
      this.loading.set(false);
      this.isAlertOpen.set(false);
    }
  }

  private reduceDayToProposedUtc(dayCtrl: FormGroup): {
    inUtc: string | null;
    outUtc: string | null;
  } {
    const dateISO = dayCtrl.get('dateISO')!.value as string;
    const entriesFA = dayCtrl.get('entries') as FormArray<FormGroup>;

    let earliestIn: string | null = null;
    let latestOut: string | null = null;

    for (const ec of entriesFA.controls) {
      const inLocal = (ec.get('inLocal')!.value as string) || '';
      const outLocal = (ec.get('outLocal')!.value as string) || '';

      const inUtc = inLocal ? parseHHMMToISO(dateISO, inLocal) : null;
      const outUtc = outLocal ? parseHHMMToISO(dateISO, outLocal) : null;

      if (inUtc && (!earliestIn || new Date(inUtc) < new Date(earliestIn)))
        earliestIn = inUtc;
      if (outUtc && (!latestOut || new Date(outUtc) > new Date(latestOut)))
        latestOut = outUtc;
    }

    if (
      earliestIn &&
      latestOut &&
      new Date(latestOut) <= new Date(earliestIn)
    ) {
      latestOut = null;
    }

    return { inUtc: earliestIn, outUtc: latestOut };
  }

  private buildWeekEdits(
    jobListingId: number,
    reason: string | null = null
  ): TimesheetAdjustmentCreateRequest[] {
    const base = this.baselineWeek();
    if (!base) return [];

    const daysFA = this.form.get('days') as FormArray<FormGroup>;
    const edits: TimesheetAdjustmentCreateRequest[] = [];

    for (const dayCtrl of daysFA.controls) {
      const dateISO = dayCtrl.get('dateISO')!.value as string;
      const { inUtc, outUtc } = this.reduceDayToProposedUtc(dayCtrl);

      const baseDay = base.days.find((d) => d.dateISO === dateISO);
      const baseIn = baseDay?.entries[0]?.checkIn ?? null;
      const baseOut = baseDay?.entries[0]?.checkOut ?? null;

      const changed = inUtc !== baseIn || outUtc !== baseOut;
      if (!changed && !(inUtc || outUtc)) continue;

      edits.push({
        jobListingId,
        workDate: toDateOnlyString(new Date(dateISO)),
        proposedCheckInUtc: inUtc,
        proposedCheckOutUtc: outUtc,
        reason,
      });
    }

    return edits;
  }
}
