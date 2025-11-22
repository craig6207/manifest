import {
  Component,
  inject,
  DestroyRef,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { NavController, ActionSheetController } from '@ionic/angular';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ProfileStore } from 'src/app/+state/profile-signal.store';
import { JobFilterOptions, JobListing } from 'src/app/interfaces/job-listing';
import { JobListingsService } from 'src/app/services/job-listings/job-listings.service';
import { TradesService } from 'src/app/services/trades/trades.service';
import {
  IonHeader,
  IonContent,
  IonToolbar,
  IonButton,
  IonIcon,
  IonLabel,
  IonList,
  IonNote,
  IonSkeletonText,
  IonButtons,
  IonModal,
  IonRange,
  IonChip,
  IonTitle,
  IonItem,
  IonSelect,
  IonSelectOption,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  locationOutline,
  briefcaseOutline,
  timeOutline,
  heartOutline,
  arrowForwardOutline,
  closeOutline,
  filterSharp,
  swapHorizontalOutline,
} from 'ionicons/icons';
import { DatePipe } from '@angular/common';
import { ToolbarBackComponent } from 'src/app/components/toolbar-back/toolbar-back.component';

@Component({
  selector: 'app-job-search',
  templateUrl: './job-search.page.html',
  styleUrls: ['./job-search.page.scss'],
  imports: [
    IonTitle,
    IonChip,
    IonRange,
    IonModal,
    IonButtons,
    IonSkeletonText,
    IonNote,
    IonList,
    IonLabel,
    IonIcon,
    IonButton,
    IonContent,
    IonHeader,
    IonToolbar,
    IonItem,
    IonSelect,
    IonSelectOption,
    ToolbarBackComponent,
    DatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JobSearchPage {
  private destroyRef = inject(DestroyRef);
  private profileStore = inject(ProfileStore);
  private jobListingsService = inject(JobListingsService);
  private tradesService = inject(TradesService);
  private nav = inject(NavController);
  private actionSheetCtrl = inject(ActionSheetController);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly jobs = signal<JobListing[]>([]);
  readonly filterOpen = signal(false);
  readonly filtersInitialized = signal(false);

  readonly subCategory = signal<string>('');
  readonly minPay = signal<number | null>(null);
  readonly startDateFrom = signal<string | null>(null);
  readonly endDateTo = signal<string | null>(null);

  readonly selectedSubcategories = signal<string[]>([]);
  readonly hourlyRate = signal<number | null>(null);
  readonly dayRate = signal<number | null>(null);
  readonly radius = signal<number>(15);

  readonly allSubcategories = signal<string[]>([]);

  readonly startDay = signal<number | null>(null);
  readonly startMonth = signal<number | null>(null);
  readonly startYear = signal<number | null>(null);
  readonly endDay = signal<number | null>(null);
  readonly endMonth = signal<number | null>(null);
  readonly endYear = signal<number | null>(null);

  readonly availableSubcategories = computed(() => {
    const set = new Set<string>();
    for (const s of this.allSubcategories()) {
      const v = s.trim();
      if (v) set.add(v);
    }
    for (const s of this.selectedSubcategories()) {
      const v = s.trim();
      if (v) set.add(v);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  });

  readonly hourlyMin = 5;
  readonly hourlyMax = 100;
  readonly dayMin = 50;
  readonly dayMax = 1000;

  readonly payMin = 10;
  readonly payMax = 100;

  readonly days = Array.from({ length: 31 }, (_, i) => i + 1);
  readonly months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ];
  readonly years: number[] = [];

  constructor() {
    addIcons({
      closeOutline,
      filterSharp,
      locationOutline,
      briefcaseOutline,
      timeOutline,
      heartOutline,
      arrowForwardOutline,
      swapHorizontalOutline,
    });

    const currentYear = new Date().getFullYear();
    for (let i = 0; i < 5; i++) {
      this.years.push(currentYear + i);
    }
  }

  ionViewWillEnter(): void {
    this.reload();
  }

  formatHourly(value: number): string {
    return `£${value}/h`;
  }

  formatDaily(value: number): string {
    return `£${value}/d`;
  }

  toggleSubcategory(sub: string): void {
    const current = this.selectedSubcategories();
    this.selectedSubcategories.set(
      current.includes(sub)
        ? current.filter((s) => s !== sub)
        : [...current, sub]
    );
  }

  setHourlyRate(value: number): void {
    const v = Number(value);
    if (Number.isFinite(v)) {
      this.hourlyRate.set(v);
      this.minPay.set(v);
    } else {
      this.hourlyRate.set(null);
      this.minPay.set(null);
    }
  }

  setDayRate(value: number): void {
    const v = Number(value);
    if (Number.isFinite(v)) {
      this.dayRate.set(v);
    } else {
      this.dayRate.set(null);
    }
  }

  onStartDayChange(value: unknown): void {
    this.startDay.set(this.toNumberOrNull(value));
    this.syncStartDate();
  }

  onStartMonthChange(value: unknown): void {
    this.startMonth.set(this.toNumberOrNull(value));
    this.syncStartDate();
  }

  onStartYearChange(value: unknown): void {
    this.startYear.set(this.toNumberOrNull(value));
    this.syncStartDate();
  }

  onEndDayChange(value: unknown): void {
    this.endDay.set(this.toNumberOrNull(value));
    this.syncEndDate();
  }

  onEndMonthChange(value: unknown): void {
    this.endMonth.set(this.toNumberOrNull(value));
    this.syncEndDate();
  }

  onEndYearChange(value: unknown): void {
    this.endYear.set(this.toNumberOrNull(value));
    this.syncEndDate();
  }

  private toNumberOrNull(value: unknown): number | null {
    const v = Number(value);
    return Number.isFinite(v) ? v : null;
  }

  private buildDate(
    year: number | null,
    month: number | null,
    day: number | null
  ): string | null {
    if (!year || !month || !day) return null;
    const mm = month.toString().padStart(2, '0');
    const dd = day.toString().padStart(2, '0');
    return `${year}-${mm}-${dd}`;
  }

  private syncStartDate(): void {
    this.startDateFrom.set(
      this.buildDate(this.startYear(), this.startMonth(), this.startDay())
    );
  }

  private syncEndDate(): void {
    this.endDateTo.set(
      this.buildDate(this.endYear(), this.endMonth(), this.endDay())
    );
  }

  private applyProfileDefaults(): void {
    const profile = this.profileStore.profile();
    if (!profile) return;

    const subs =
      profile.tradeSubcategory != null
        ? String(profile.tradeSubcategory)
            .split(/[,;|]/)
            .map((s) => s.trim())
            .filter(Boolean)
        : [];

    this.selectedSubcategories.set(subs);
    this.subCategory.set(subs[0] ?? '');

    const expected =
      typeof profile.expectedPay === 'number' &&
      Number.isFinite(profile.expectedPay)
        ? profile.expectedPay
        : null;

    this.minPay.set(expected);
    this.hourlyRate.set(expected ?? this.hourlyMin);
    this.dayRate.set(this.dayMin);

    this.startDay.set(null);
    this.startMonth.set(null);
    this.startYear.set(null);
    this.endDay.set(null);
    this.endMonth.set(null);
    this.endYear.set(null);
    this.startDateFrom.set(null);
    this.endDateTo.set(null);
  }

  private loadTradeSubcategories(tradeName: string): void {
    this.tradesService
      .getTradeSubcategoriesByName(tradeName)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (items) => {
          const names = items
            .map((t: any) => String(t.name ?? '').trim())
            .filter((n) => !!n);
          this.allSubcategories.set(names);
        },
        error: () => {
          this.allSubcategories.set([]);
        },
      });
  }

  openFilter(): void {
    if (!this.filtersInitialized()) {
      this.applyProfileDefaults();
      const profile = this.profileStore.profile();
      const tradeName = profile?.tradeCategory;
      if (tradeName && tradeName.trim().length > 0) {
        this.loadTradeSubcategories(tradeName);
      } else {
        this.allSubcategories.set([]);
      }
      this.filtersInitialized.set(true);
    }
    this.filterOpen.set(true);
  }

  closeFilter(): void {
    this.filterOpen.set(false);
  }

  resetFilters(): void {
    this.applyProfileDefaults();
    this.radius.set(15);
  }

  applyFilters(): void {
    const selected = this.selectedSubcategories();
    this.subCategory.set(selected.length ? selected.join(',') : '');

    const hr = this.hourlyRate();
    this.minPay.set(hr != null ? hr : null);

    this.syncStartDate();
    this.syncEndDate();
    this.closeFilter();
    this.reload();
  }

  async openRadiusSheet(): Promise<void> {
    const options = Array.from({ length: 10 }, (_, i) => (i + 1) * 5);
    const sheet = await this.actionSheetCtrl.create({
      header: 'Set radius',
      buttons: [
        ...options.map((m) => ({
          text: `${m} miles`,
          handler: () => this.radius.set(m),
        })),
        { text: 'Cancel', role: 'cancel' },
      ],
    });
    await sheet.present();
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

    const opts: JobFilterOptions = {
      skip: 0,
      take: 20,
      includePast: false,
    };

    if (this.subCategory()) {
      opts.subCategory = this.subCategory();
    }

    if (this.minPay() != null) {
      opts.minPay = this.minPay()!;
    }

    if (this.startDateFrom()) {
      opts.startDateFrom = this.startDateFrom()!;
    }

    if (this.endDateTo()) {
      opts.endDateTo = this.endDateTo()!;
    }

    const r = this.radius();
    if (r && r > 0) {
      opts.radiusMiles = r;
    }

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

  goToPreferences(): void {
    this.nav.navigateForward('secure/tabs/profile/job-preferences');
  }
}
