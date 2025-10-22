import {
  Component,
  computed,
  effect,
  inject,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonButton,
  IonIcon,
  IonLabel,
  IonList,
  IonItem,
  IonRefresher,
  IonRefresherContent,
  IonSkeletonText,
  IonText,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  briefcaseOutline,
  businessOutline,
  chevronForwardOutline,
  documentTextOutline,
} from 'ionicons/icons';
import { NavController } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { TimesheetService } from 'src/app/services/timesheet/timesheet.service';
import { JobAssignmentSummary } from 'src/app/interfaces/timesheets';

addIcons({
  briefcaseOutline,
  businessOutline,
  chevronForwardOutline,
  documentTextOutline,
});

function parseDateOnlyToLocal(
  dateOnly: string | null | undefined
): Date | null {
  if (!dateOnly) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOnly);
  if (!m) return null;
  const y = Number(m[1]),
    mo = Number(m[2]) - 1,
    d = Number(m[3]);
  const dt = new Date(y, mo, d, 0, 0, 0, 0);
  return isNaN(dt.getTime()) ? null : dt;
}

function shortDate(d: Date): string {
  return d.toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function dateRangeLabel(
  startDateOnly: string,
  endDateOnly: string | null
): string {
  const s = parseDateOnlyToLocal(startDateOnly);
  const e = parseDateOnlyToLocal(endDateOnly ?? undefined);
  const left = s ? shortDate(s) : '—';
  const right = e ? shortDate(e) : 'Present';
  return `${left} — ${right}`;
}

@Component({
  selector: 'app-timesheets',
  imports: [
    IonText,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonButton,
    IonIcon,
    IonLabel,
    IonList,
    IonItem,
    IonRefresher,
    IonRefresherContent,
    IonSkeletonText,
  ],
  templateUrl: './timesheets.page.html',
  styleUrls: ['timesheets.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimesheetsPage {
  private readonly nav = inject(NavController);
  private readonly svc = inject(TimesheetService);

  readonly loading = signal(true);
  readonly current = signal<JobAssignmentSummary | null>(null);
  readonly history = signal<JobAssignmentSummary[]>([]);

  readonly hasCurrent = computed(() => !!this.current());
  readonly hasHistory = computed(() => this.history().length > 0);

  constructor() {
    effect(() => {
      this.load();
    });
  }

  async load() {
    this.loading.set(true);
    try {
      const [cur, past] = await Promise.all([
        firstValueFrom(this.svc.getCurrentJob()),
        firstValueFrom(this.svc.getHistoryJobs()),
      ]);

      this.current.set(cur ?? null);

      this.history.set(
        [...(past ?? [])].sort((a, b) => {
          const aEnd = parseDateOnlyToLocal(a.endDate)?.getTime() ?? 0;
          const bEnd = parseDateOnlyToLocal(b.endDate)?.getTime() ?? 0;
          return bEnd - aEnd;
        })
      );
    } finally {
      this.loading.set(false);
    }
  }

  onRefresh(ev: CustomEvent) {
    this.load().then(() => (ev.detail as any).complete());
  }

  dates(a: JobAssignmentSummary) {
    return dateRangeLabel(a.startDate, a.endDate);
  }

  openCurrentTimesheet(a: JobAssignmentSummary | null) {
    if (!a) return;
    this.nav.navigateForward(
      `/secure/tabs/timesheets-edit?jobListingId=${a.jobListingId}`
    );
  }

  openHistoricalTimesheet(a: JobAssignmentSummary) {
    const dateOnly = a.endDate ?? a.startDate;
    this.nav.navigateForward(
      `/secure/tabs/timesheets-edit?jobListingId=${a.jobListingId}&date=${dateOnly}`
    );
  }
}
