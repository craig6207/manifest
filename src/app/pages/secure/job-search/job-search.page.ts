import {
  Component,
  inject,
  DestroyRef,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { NavController } from '@ionic/angular';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ProfileStore } from 'src/app/+state/profile-signal.store';
import { JobFilterOptions, JobListing } from 'src/app/interfaces/job-listing';
import { JobListingsService } from 'src/app/services/job-listings/job-listings.service';
import {
  IonHeader,
  IonContent,
  IonToolbar,
  IonTitle,
  IonButton,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonSkeletonText,
  IonButtons,
  IonFooter,
  IonDatetime,
  IonModal,
  IonRange,
  IonSelect,
  IonSelectOption,
  IonItemSliding,
  IonItemOptions,
  IonItemOption,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  calendarOutline,
  locationOutline,
  funnelOutline,
  briefcaseOutline,
  chevronForwardOutline,
} from 'ionicons/icons';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-job-search',
  templateUrl: './job-search.page.html',
  styleUrls: ['./job-search.page.scss'],
  imports: [
    IonItemOption,
    IonItemOptions,
    IonItemSliding,
    IonRange,
    IonModal,
    IonDatetime,
    IonFooter,
    IonButtons,
    IonSkeletonText,
    IonNote,
    IonList,
    IonLabel,
    IonItem,
    IonIcon,
    IonButton,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonSelect,
    IonSelectOption,
    DatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JobSearchPage {
  private destroyRef = inject(DestroyRef);
  private profileStore = inject(ProfileStore);
  private jobListingsService = inject(JobListingsService);
  private nav = inject(NavController);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly jobs = signal<JobListing[]>([]);
  readonly filterOpen = signal(false);
  readonly filtersInitialized = signal(false);
  readonly subCategory = signal<string>('');
  readonly minPay = signal<number | null>(null);
  readonly startDateFrom = signal<string | null>(null);

  readonly payMin = 10;
  readonly payMax = 100;

  constructor() {
    addIcons({
      calendarOutline,
      locationOutline,
      funnelOutline,
      briefcaseOutline,
      chevronForwardOutline,
    });
  }

  ionViewWillEnter(): void {
    this.reload();
  }

  readonly availableSubcategories = computed(() => {
    const set = new Set<string>();
    for (const j of this.jobs()) {
      const v = j.tradeSubCategory?.trim();
      if (v) set.add(v);
    }
    const current = this.subCategory();
    if (current) set.add(current);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  });

  setSubCategory(value: string): void {
    this.subCategory.set(value ?? '');
  }
  setMinPay(value: number): void {
    const v = Number(value);
    this.minPay.set(Number.isFinite(v) ? v : null);
  }
  setStartDateFrom(iso: string | null): void {
    if (!iso) {
      this.startDateFrom.set(null);
      return;
    }
    this.startDateFrom.set(iso.substring(0, 10));
  }

  private getProfileDefaults(): {
    subCategory: string;
    minPay: number | null;
    startDateFrom: string | null;
  } {
    const profile = this.profileStore.profile();
    const sub = profile?.tradeSubcategory
      ? String(profile.tradeSubcategory)
          .split(/[,;|]/)
          .map((s) => s.trim())
          .filter(Boolean)[0] ?? ''
      : '';

    const expected =
      typeof profile?.expectedPay === 'number' &&
      Number.isFinite(profile.expectedPay)
        ? profile.expectedPay
        : null;
    return { subCategory: sub, minPay: expected, startDateFrom: null };
  }

  private applyProfileDefaults(): void {
    const d = this.getProfileDefaults();
    this.subCategory.set(d.subCategory);
    this.minPay.set(d.minPay);
    this.startDateFrom.set(d.startDateFrom);
  }

  openFilter(): void {
    if (!this.filtersInitialized()) {
      this.applyProfileDefaults();
      this.filtersInitialized.set(true);
    }
    this.filterOpen.set(true);
  }

  closeFilter(): void {
    this.filterOpen.set(false);
  }

  resetFilters(): void {
    this.applyProfileDefaults();
  }

  applyFilters(): void {
    this.closeFilter();
    this.reload();
  }

  private reload(): void {
    const profile = this.profileStore.profile();
    if (!profile) {
      this.error.set('Profile not loaded.');
      return;
    }
    if (!(profile as any).userId) {
      this.error.set('Profile id missing from /me response.');
      return;
    }

    const opts: JobFilterOptions = { skip: 0, take: 20, includePast: false };
    if (this.subCategory()) opts.subCategory = this.subCategory();
    if (this.minPay() != null) opts.minPay = this.minPay()!;
    if (this.startDateFrom()) opts.startDateFrom = this.startDateFrom()!;

    this.loading.set(true);
    this.error.set(null);

    this.jobListingsService
      .getForCandidate((profile as any).userId, opts)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (items) => {
          this.jobs.set(items);
          this.loading.set(false);
        },
        error: (err) => {
          this.error.set(this.readHttpError(err));
          this.loading.set(false);
        },
      });
  }

  private readHttpError(err: unknown): string {
    if (typeof err === 'object' && err !== null) {
      const anyErr = err as {
        error?: unknown;
        message?: string;
        status?: number;
      };
      if (
        typeof anyErr.error === 'object' &&
        anyErr.error &&
        'message' in anyErr.error
      ) {
        const api = anyErr.error as { message?: string };
        if (api.message) return api.message;
      }
      if (anyErr.message) return anyErr.message;
    }
    return 'Something went wrong. Please try again.';
  }

  openJob(job: JobListing): void {
    this.nav.navigateForward(['secure/tabs/job-detail', job.id], {
      state: { job },
    });
  }
}
