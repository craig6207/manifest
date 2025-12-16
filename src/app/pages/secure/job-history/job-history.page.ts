import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { formatDate } from '@angular/common';
import {
  IonHeader,
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
  IonButton,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  briefcaseOutline,
  calendarOutline,
  timeOutline,
  businessOutline,
} from 'ionicons/icons';
import {
  CandidateJobs,
  JobStatus,
  Page,
  Segment,
} from 'src/app/interfaces/candidate-jobs';
import { firstValueFrom } from 'rxjs';
import { JobActivityService } from 'src/app/services/job-activity/job-activity.service';
import { ToolbarBackComponent } from 'src/app/components/toolbar-back/toolbar-back.component';

@Component({
  selector: 'app-job-history',
  templateUrl: './job-history.page.html',
  styleUrls: ['./job-history.page.scss'],
  imports: [
    IonHeader,
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
    IonButton,
    ToolbarBackComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'job-history-page' },
})
export class JobHistoryPage {
  private jobHistoryService = inject(JobActivityService);

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

  private async fetchPage(cursor: string | null): Promise<Page<CandidateJobs>> {
    const pageNum = cursor ? Number(cursor) : 1;
    return await firstValueFrom(
      this.jobHistoryService.getMyJobs({
        segment: this.segment(),
        page: pageNum,
        pageSize: 20,
      })
    );
  }

  onSegmentChange(val: Segment) {
    this.segment.set(val);
    if (!this.isLoading()) this.reload();
  }
}
