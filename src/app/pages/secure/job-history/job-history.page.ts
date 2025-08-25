import {
  ChangeDetectionStrategy,
  Component,
  computed,
  signal,
} from '@angular/core';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonRefresher,
  IonRefresherContent,
  IonItem,
  IonLabel,
  IonNote,
  IonList,
  IonIcon,
  IonSkeletonText,
  IonBadge,
  IonSegment,
  IonSegmentButton,
  IonFooter,
  IonAvatar,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  briefcaseOutline,
  calendarOutline,
  timeOutline,
  businessOutline,
} from 'ionicons/icons';
import { formatDate } from '@angular/common';
import {
  CandidateJobs,
  JobStatus,
  Page,
  Segment,
} from 'src/app/interfaces/candidate-jobs';

@Component({
  selector: 'app-job-history',
  templateUrl: './job-history.page.html',
  styleUrls: ['./job-history.page.scss'],
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButton,
    IonContent,
    IonRefresher,
    IonRefresherContent,
    IonItem,
    IonLabel,
    IonNote,
    IonList,
    IonIcon,
    IonSkeletonText,
    IonBadge,
    IonSegment,
    IonSegmentButton,
    IonFooter,
    IonAvatar,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'job-history-page' },
})
export class JobHistoryPage {
  segment = signal<Segment>('BOOKED');
  isLoading = signal(true);

  data = signal<CandidateJobs[]>([]);
  nextCursor = signal<string | null>(null);
  hasMore = signal(true);
  loadingMore = signal(false);

  filtered = computed(() => {
    const view = this.segment();
    const all = this.data();
    if (view === 'BOOKED') return all.filter((j) => j.status === 'IN_WORK');
    if (view === 'OFFERED') return all.filter((j) => j.status === 'OFFERED');
    return all.filter((j) => j.status === 'APPLIED');
  });

  constructor() {
    addIcons({
      briefcaseOutline,
      calendarOutline,
      timeOutline,
      businessOutline,
    });
  }

  ionViewWillEnter() {
    this.reload();
  }

  async reload() {
    this.isLoading.set(true);
    this.hasMore.set(true);
    this.nextCursor.set(null);
    try {
      const page = await this.fetchPage(null);
      this.data.set(page.items);
      this.nextCursor.set(page.nextCursor ?? null);
      this.hasMore.set(!!page.nextCursor);
    } finally {
      this.isLoading.set(false);
    }
  }

  async loadMore(ev: CustomEvent) {
    if (this.loadingMore() || !this.hasMore()) {
      (ev.target as HTMLIonInfiniteScrollElement).complete();
      return;
    }
    this.loadingMore.set(true);
    try {
      const page = await this.fetchPage(this.nextCursor());
      this.data.update((curr) => curr.concat(page.items));
      this.nextCursor.set(page.nextCursor ?? null);
      this.hasMore.set(!!page.nextCursor);
    } finally {
      this.loadingMore.set(false);
      (ev.target as HTMLIonInfiniteScrollElement).complete();
    }
  }

  refresh(ev: CustomEvent) {
    this.reload().finally(() =>
      (ev.target as HTMLIonRefresherElement).complete()
    );
  }

  onSegmentChange(val: Segment) {
    this.segment.set(val);
    if (!this.isLoading() && this.filtered().length === 0 && this.hasMore()) {
      // you could pre-filter server-side by status here
    }
  }

  openJob(candidateJob: CandidateJobs) {
    console.log('open job', candidateJob);
  }

  goBrowse() {
    console.log('browse');
  }

  formatDateLocal(iso?: string): string {
    if (!iso) return '';
    return formatDate(new Date(iso), 'EEE d MMM, HH:mm', 'en-GB');
  }

  formatRange(startIso: string, endIso?: string): string {
    const s = new Date(startIso);
    if (!endIso) return formatDate(s, 'EEE d MMM', 'en-GB');
    const e = new Date(endIso);
    const same = s.toDateString() === e.toDateString();
    return same
      ? `${formatDate(s, 'EEE d MMM', 'en-GB')} · ${formatDate(
          s,
          'HH:mm',
          'en-GB'
        )}–${formatDate(e, 'HH:mm', 'en-GB')}`
      : `${formatDate(s, 'EEE d MMM', 'en-GB')} → ${formatDate(
          e,
          'EEE d MMM',
          'en-GB'
        )}`;
  }

  labelFor(s: JobStatus): string {
    switch (s) {
      case 'APPLIED':
        return 'Applied';
      case 'OFFERED':
        return 'Offered';
      case 'IN_WORK':
        return 'Booked';
      case 'COMPLETE':
        return 'Complete';
    }
  }

  badgeColor(s: JobStatus): string {
    switch (s) {
      case 'APPLIED':
        return 'medium';
      case 'OFFERED':
        return 'tertiary';
      case 'IN_WORK':
        return 'success';
      case 'COMPLETE':
        return 'secondary';
    }
  }

  // ===== Replace with real API calls (keyset pagination is ideal) =====
  private async fetchPage(cursor: string | null): Promise<Page<CandidateJobs>> {
    await new Promise((r) => setTimeout(r, 400));
    const base = cursor ? Number(cursor) : 0;
    const batch = this.mockData().slice(base, base + 3);
    const next = base + 3 < this.mockData().length ? String(base + 3) : null;
    return { items: batch, nextCursor: next };
  }
  private mockData(): CandidateJobs[] {
    const now = new Date();
    const tmr = new Date(now.getTime() + 24 * 3600e3);
    return [
      {
        id: '1',
        jobId: 'J-1001',
        title: 'Electrician (Day Shift)',
        clientName: 'Acme Construction',
        location: 'Edinburgh',
        startDateUtc: now.toISOString(),
        nextShiftUtc: tmr.toISOString(),
        hourlyRate: 22,
        status: 'IN_WORK',
      },
      {
        id: '2',
        jobId: 'J-1002',
        title: 'Joiner',
        clientName: 'Lothian Works',
        location: 'Musselburgh',
        startDateUtc: tmr.toISOString(),
        status: 'OFFERED',
        offeredAtUtc: now.toISOString(),
      },
      {
        id: '3',
        jobId: 'J-1003',
        title: 'General Labourer',
        clientName: 'Urban Build',
        location: 'Leith',
        startDateUtc: tmr.toISOString(),
        status: 'APPLIED',
        appliedAtUtc: now.toISOString(),
      },
      {
        id: '4',
        jobId: 'J-1004',
        title: 'Painter',
        clientName: 'Capital Decor',
        location: 'Edinburgh',
        startDateUtc: tmr.toISOString(),
        status: 'APPLIED',
      },
      {
        id: '5',
        jobId: 'J-1005',
        title: 'Electrician (Night Shift)',
        clientName: 'North Build',
        location: 'Fife',
        startDateUtc: tmr.toISOString(),
        status: 'OFFERED',
      },
      {
        id: '6',
        jobId: 'J-1006',
        title: 'Labourer',
        clientName: 'East Coast',
        location: 'Haddington',
        startDateUtc: tmr.toISOString(),
        status: 'IN_WORK',
      },
    ];
  }
}
