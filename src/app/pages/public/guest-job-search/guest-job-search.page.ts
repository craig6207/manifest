import {
  Component,
  ChangeDetectionStrategy,
  DestroyRef,
  inject,
  signal,
  OnInit,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavController } from '@ionic/angular';
import {
  IonHeader,
  IonContent,
  IonItem,
  IonSelect,
  IonSelectOption,
  IonIcon,
  IonList,
  IonNote,
  IonSkeletonText,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { briefcaseOutline, arrowForwardOutline } from 'ionicons/icons';
import { TradesService } from 'src/app/services/trades/trades.service';
import { Trades } from 'src/app/interfaces/trades';
import { PublicJobListing } from 'src/app/interfaces/job-listing';
import { JobListingsService } from 'src/app/services/job-listings/job-listings.service';
import { ToolbarBackComponent } from 'src/app/components/toolbar-back/toolbar-back.component';

@Component({
  selector: 'app-guest-job-search',
  templateUrl: './guest-job-search.page.html',
  styleUrls: ['./guest-job-search.page.scss'],
  imports: [
    IonHeader,
    IonContent,
    IonItem,
    IonSelect,
    IonSelectOption,
    IonIcon,
    IonList,
    IonNote,
    IonSkeletonText,
    ToolbarBackComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GuestJobSearchPage implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly tradesService = inject(TradesService);
  private readonly jobListingsService = inject(JobListingsService);
  private readonly nav = inject(NavController);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly trades = signal<Trades[]>([]);
  readonly selectedTradeName = signal<string | null>(null);

  readonly jobs = signal<PublicJobListing[]>([]);

  readonly loadingTrades = signal(false);
  readonly loadingJobs = signal(false);

  constructor() {
    addIcons({
      briefcaseOutline,
      arrowForwardOutline,
    });
  }

  ngOnInit(): void {
    this.reloadJobs();
    this.loadTrades();
  }

  private loadTrades(): void {
    this.loadingTrades.set(true);
    this.error.set(null);

    this.tradesService
      .getTrades()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (items) => {
          const cleaned = (items ?? [])
            .filter((t) => !!t && !!String((t as any).name ?? '').trim())
            .sort((a, b) => String(a.name).localeCompare(String(b.name)));

          this.trades.set(cleaned);
          this.loadingTrades.set(false);
        },
        error: (err) => {
          this.error.set(this.readHttpError(err));
          this.loadingTrades.set(false);
        },
      });
  }

  onTradeChange(tradeName: string | null): void {
    const t = String(tradeName ?? '').trim();
    this.selectedTradeName.set(t.length ? t : null);
    this.reloadJobs();
  }

  private reloadJobs(): void {
    this.loadingJobs.set(true);
    this.error.set(null);

    const tradeName = this.selectedTradeName();

    this.jobListingsService
      .getPublic({ trade: tradeName ?? undefined, skip: 0, take: 50 })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (items) => {
          this.jobs.set(items ?? []);
          this.loadingJobs.set(false);
        },
        error: (err) => {
          this.error.set(this.readHttpError(err));
          this.loadingJobs.set(false);
        },
      });
  }

  openJobRequiresLogin(): void {
    this.nav.navigateBack(['/login']);
  }

  private readHttpError(err: unknown): string {
    if (typeof err === 'object' && err !== null) {
      const anyErr = err as { error?: any; message?: string };
      if (anyErr?.error?.message) return String(anyErr.error.message);
      if (anyErr?.message) return String(anyErr.message);
    }
    return 'Something went wrong. Please try again.';
  }
}
