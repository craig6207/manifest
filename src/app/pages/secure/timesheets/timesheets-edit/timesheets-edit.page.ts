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

type WeekStatus = 'Open' | 'Submitted' | 'Approved';

interface TimesheetEntry {
  checkIn: string;
  checkOut: string | null;
}
interface TimesheetDay {
  dateISO: string;
  entries: TimesheetEntry[];
}
interface TimesheetWeek {
  weekStartISO: string;
  weekEndISO: string;
  status: WeekStatus;
  days: TimesheetDay[];
}

class TimesheetService {
  async getWeek(weekStartISO: string): Promise<TimesheetWeek> {
    // TODO: replace with REST call
    const start = new Date(weekStartISO);
    const days = [...Array(7)].map((_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      d.setHours(0, 0, 0, 0);
      return d;
    });

    const today = new Date();
    const isSameWeek =
      start.getFullYear() === startOfWeek(today).getFullYear() &&
      start.getTime() === startOfWeek(today).getTime();

    const sample: TimesheetDay[] = days.map((d, i) => {
      const dateISO = d.toISOString();
      if (isSameWeek && i === 0) {
        // Monday: 07:30 - 16:00
        const ci = setTime(d, 7, 30).toISOString();
        const co = setTime(d, 16, 0).toISOString();
        return { dateISO, entries: [{ checkIn: ci, checkOut: co }] };
      }
      if (isSameWeek && i === 1) {
        // Tuesday: checked in only
        const ci = setTime(d, 7, 30).toISOString();
        return { dateISO, entries: [{ checkIn: ci, checkOut: null }] };
      }
      return { dateISO, entries: [] };
    });

    return {
      weekStartISO,
      weekEndISO: addDays(start, 6).toISOString(),
      status: 'Open',
      days: sample,
    };
  }

  async submit(payload: TimesheetWeek): Promise<void> {
    // TODO: POST submit endpoint
    await delay(400);
  }
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
  const e = addDays(s, 6);
  e.setHours(23, 59, 59, 999);
  return e;
}
function addDays(d: Date, days: number): Date {
  const c = new Date(d);
  c.setDate(c.getDate() + days);
  return c;
}
function setTime(baseDate: Date, hours: number, minutes: number): Date {
  const d = new Date(baseDate);
  d.setHours(hours, minutes, 0, 0);
  return d;
}
function toISODateMidnight(d: Date): string {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c.toISOString();
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
  const [h, m] = hhmmStr.split(':').map((n) => Number(n));
  const d = new Date(dateISO);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}
function hoursBetween(ci: Date, co: Date | null): number {
  if (!co) return 0;
  const ms = co.getTime() - ci.getTime();
  return Math.max(0, ms / (1000 * 60 * 60));
}
function delay(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

function applyLunchDeduction(hours: number): number {
  return hours > 0 ? Math.max(0, hours - 0.5) : 0;
}

@Component({
  selector: 'app-timesheets-edit',
  imports: [
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
  private readonly svc = new TimesheetService();

  readonly loading = signal(true);
  readonly editing = signal(false);
  readonly selectedDate = signal(new Date());
  readonly week = signal<TimesheetWeek | null>(null);

  readonly weekStart = computed(() => startOfWeek(this.selectedDate()));
  readonly weekEnd = computed(() => endOfWeek(this.selectedDate()));
  readonly selectedDateISO = computed(() => this.selectedDate().toISOString());
  readonly weekStatus = computed<WeekStatus>(
    () => this.week()?.status ?? 'Open'
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
      const totalHoursLabel = total > 0 ? `${total.toFixed(2)} h` : '';

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

  readonly dummy = this.fb.group({});

  constructor() {
    effect(() => {
      const startISO = toISODateMidnight(this.weekStart());
      this.loadWeek(startISO);
    });
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

  private buildForm(w: TimesheetWeek) {
    this.form.reset();
    const dayGroups = w.days.map((day) => {
      const date = new Date(day.dateISO);
      const { weekdayShort, displayDate } = formatDayLabel(date);

      const entriesFA = this.fb.array<FormGroup>(
        (day.entries.length > 0
          ? day.entries
          : [{ checkIn: date.toISOString(), checkOut: null }]
        ).map((e) => {
          const ci = new Date(e.checkIn);
          const co = e.checkOut ? new Date(e.checkOut) : null;
          return this.fb.group({
            inLocal: new FormControl<string>(hhmm(ci) ?? ''),
            outLocal: new FormControl<string>(hhmm(co) ?? ''),
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

  private async loadWeek(weekStartISO: string) {
    this.loading.set(true);
    try {
      const w = await this.svc.getWeek(weekStartISO);
      this.week.set(w);
      this.buildForm(w);
    } finally {
      this.loading.set(false);
      this.editing.set(false);
    }
  }

  goPrevWeek() {
    this.selectedDate.set(addDays(this.weekStart(), -1));
  }
  goNextWeek() {
    this.selectedDate.set(addDays(this.weekEnd(), 1));
  }
  onDatePicked(ev: CustomEvent) {
    const value = (ev.detail as unknown as { value: string }).value;
    if (value) this.selectedDate.set(new Date(value));
  }
  onRefresh(ev: CustomEvent) {
    const startISO = toISODateMidnight(this.weekStart());
    this.loadWeek(startISO).then(() => (ev.detail as any).complete());
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

  private formToPayload(): TimesheetWeek {
    const weekStartISO = this.form.get('weekStartISO')!.value as string;
    const weekEndISO = this.form.get('weekEndISO')!.value as string;

    const daysFA = this.form.get('days') as FormArray<FormGroup>;
    const days: TimesheetDay[] = daysFA.controls.map((dayCtrl) => {
      const dateISO = dayCtrl.get('dateISO')!.value as string;
      const entriesFA = dayCtrl.get('entries') as FormArray<FormGroup>;
      const entries: TimesheetEntry[] = entriesFA.controls
        .map((ec) => {
          const inLocal = ec.get('inLocal')!.value as string;
          const outLocal = (ec.get('outLocal')!.value as string) || null;
          return {
            checkIn: parseHHMMToISO(dateISO, inLocal)!,
            checkOut: parseHHMMToISO(dateISO, outLocal),
          };
        })
        .filter((e) => !!e.checkIn);
      return { dateISO, entries };
    });

    return {
      weekStartISO,
      weekEndISO,
      status: this.weekStatus(),
      days,
    };
  }

  async submitForApproval() {
    const payload = this.formToPayload();
    await this.svc.submit(payload);
    this.week.set({ ...payload, status: 'Submitted' });
    this.editing.set(false);
  }
}
