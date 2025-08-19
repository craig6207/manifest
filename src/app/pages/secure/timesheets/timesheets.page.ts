import { Component, computed, effect, inject, signal } from '@angular/core';
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
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  briefcaseOutline,
  businessOutline,
  locationOutline,
  calendarOutline,
  walletOutline,
  chevronForwardOutline,
  timeOutline,
  checkmarkCircleOutline,
  alertCircleOutline,
  documentTextOutline,
} from 'ionicons/icons';
import { NavController } from '@ionic/angular';

addIcons({
  briefcaseOutline,
  businessOutline,
  locationOutline,
  calendarOutline,
  walletOutline,
  chevronForwardOutline,
  timeOutline,
  checkmarkCircleOutline,
  alertCircleOutline,
  documentTextOutline,
});

type WeekStatus = 'Open' | 'Submitted' | 'Approved';

interface JobAssignment {
  jobId: string;
  role: string;
  siteName: string;
  clientName: string;
  location: string;
  postcode: string;
  startDateISO: string;
  endDateISO: string | null;
  ratePerHour: number;
  hoursThisWeek: number;
  lastWeekStatus: WeekStatus;
}

class TimesheetJobsService {
  async getCurrentAssignment(): Promise<JobAssignment | null> {
    const today = new Date();
    return {
      jobId: 'job_current_001',
      role: 'Electrician',
      siteName: 'Barratt Homes – Plot 42',
      clientName: 'Lime Electrical',
      location: 'Edinburgh',
      postcode: 'EH12 5AB',
      startDateISO: new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() - 21
      ).toISOString(),
      endDateISO: null,
      ratePerHour: 18.5,
      hoursThisWeek: 16,
      lastWeekStatus: 'Open',
    };
  }

  async getPastAssignments(): Promise<JobAssignment[]> {
    const d1End = new Date();
    d1End.setMonth(d1End.getMonth() - 1);
    d1End.setDate(d1End.getDate() - 3);
    const d1Start = new Date(d1End);
    d1Start.setMonth(d1End.getMonth() - 2);

    const d2End = new Date();
    d2End.setMonth(d2End.getMonth() - 4);
    d2End.setDate(d2End.getDate() - 10);
    const d2Start = new Date(d2End);
    d2Start.setMonth(d2End.getMonth() - 1);

    return [
      {
        jobId: 'job_hist_123',
        role: 'Labourer',
        siteName: 'Miller Homes - Riverside',
        clientName: 'M-Pact',
        location: 'Glasgow',
        postcode: 'G3 7PQ',
        startDateISO: d1Start.toISOString(),
        endDateISO: d1End.toISOString(),
        ratePerHour: 15,
        hoursThisWeek: 0,
        lastWeekStatus: 'Approved',
      },
      {
        jobId: 'job_hist_987',
        role: 'Heating Engineer',
        siteName: 'Balfour - Eastfield',
        clientName: 'Balfour Beatty',
        location: 'Dunfermline',
        postcode: 'KY12 7XX',
        startDateISO: d2Start.toISOString(),
        endDateISO: d2End.toISOString(),
        ratePerHour: 17.25,
        hoursThisWeek: 0,
        lastWeekStatus: 'Submitted',
      },
    ];
  }
}

function moneyGBP(n: number): string {
  return n.toLocaleString('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 2,
  });
}
function shortDate(d: Date): string {
  return d.toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
function dateRangeLabel(startISO: string, endISO: string | null): string {
  const s = new Date(startISO);
  const left = shortDate(s);
  if (!endISO) return `${left} — Present`;
  const e = new Date(endISO);
  return `${left} — ${shortDate(e)}`;
}
function statusColor(s: WeekStatus): 'success' | 'warning' | 'medium' {
  if (s === 'Approved') return 'success';
  if (s === 'Submitted') return 'warning';
  return 'medium';
}

@Component({
  selector: 'app-timesheets',
  imports: [
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
  ],
  templateUrl: './timesheets.page.html',
  styleUrls: ['timesheets.page.scss'],
})
export class TimesheetsPage {
  private readonly nav = inject(NavController);
  private readonly svc = new TimesheetJobsService();

  readonly loading = signal(true);
  readonly current = signal<JobAssignment | null>(null);
  readonly history = signal<JobAssignment[]>([]);

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
        this.svc.getCurrentAssignment(),
        this.svc.getPastAssignments(),
      ]);
      this.current.set(cur);
      this.history.set(
        [...past].sort((a, b) => {
          const aEnd = a.endDateISO ? new Date(a.endDateISO).getTime() : 0;
          const bEnd = b.endDateISO ? new Date(b.endDateISO).getTime() : 0;
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

  money(n: number) {
    return moneyGBP(n);
  }
  dates(a: JobAssignment) {
    return dateRangeLabel(a.startDateISO, a.endDateISO);
  }
  statusColor(s: WeekStatus) {
    return statusColor(s);
  }

  openCurrentTimesheet(a: JobAssignment | null) {
    console.log('here we are');
    if (!a) return;
    this.nav.navigateForward('/secure/tabs/timesheets-edit');
  }

  openHistoricalTimesheet(a: JobAssignment) {
    this.nav.navigateForward('/secure/tabs/timesheets-edit');
  }
}
