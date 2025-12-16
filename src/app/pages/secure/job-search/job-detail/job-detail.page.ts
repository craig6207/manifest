import {
  Component,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { Router } from '@angular/router';
import {
  IonHeader,
  IonIcon,
  IonButton,
  IonFooter,
  IonToolbar,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  locationOutline,
  cashOutline,
  calendarOutline,
  timeOutline,
  heartOutline,
} from 'ionicons/icons';
import { DatePipe } from '@angular/common';
import { JobListing } from 'src/app/interfaces/job-listing';
import { JobPipelineService } from 'src/app/services/job-pipeline/job-pipeline.service';
import { ProfileStore } from 'src/app/+state/profile-signal.store';
import { firstValueFrom } from 'rxjs';
import { ToolbarBackComponent } from 'src/app/components/toolbar-back/toolbar-back.component';

@Component({
  selector: 'app-job-detail',
  standalone: true,
  imports: [
    IonHeader,
    IonIcon,
    IonButton,
    IonFooter,
    IonToolbar,
    DatePipe,
    ToolbarBackComponent,
  ],
  templateUrl: './job-detail.page.html',
  styleUrls: ['./job-detail.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JobDetailPage {
  private router = inject(Router);
  private pipeline = inject(JobPipelineService);
  private profileStore = inject(ProfileStore);

  readonly applying = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);

  readonly jobListing = signal<JobListing | null>(null);
  readonly title = computed(() => this.jobListing()?.trade ?? '');
  readonly subcat = computed(() => this.jobListing()?.tradeSubCategory ?? '');
  readonly pay = computed(() => this.jobListing()?.payRate ?? 0);
  readonly loc = computed(() => this.jobListing()?.location ?? '');
  readonly certs = computed(() => this.jobListing()?.certification ?? []);
  readonly hours = computed(() => this.jobListing()?.hours ?? []);
  readonly start = computed(() =>
    this.jobListing()?.startDate ? new Date(this.jobListing()!.startDate) : null
  );
  readonly end = computed(() =>
    this.jobListing()?.endDate ? new Date(this.jobListing()!.endDate) : null
  );
  readonly desc = computed(() => this.jobListing()?.projectInfo ?? '');

  constructor() {
    addIcons({
      locationOutline,
      cashOutline,
      calendarOutline,
      timeOutline,
      heartOutline,
    });

    const stateJob =
      (this.router.getCurrentNavigation()?.extras?.state as any)?.job ??
      (history.state?.job as JobListing | undefined);

    if (stateJob) {
      this.jobListing.set(stateJob);
    }
  }

  private get candidateId(): number | null {
    const p = this.profileStore.profile();
    return p?.candidateId ?? null;
  }

  async applyNow(): Promise<void> {
    this.error.set(null);
    this.success.set(null);

    const jobId = this.jobListing()?.id ?? null;
    const candId = this.candidateId;

    if (!jobId || !candId) {
      this.error.set('Missing job or candidate details.');
      return;
    }

    const payload = {
      jobListingId: jobId,
      candidateId: candId,
      action: 'accept' as const,
    };

    this.applying.set(true);
    try {
      await firstValueFrom(this.pipeline.respondToInvite(payload));
      this.success.set("Thanks! We've let the client know you're interested.");
      setTimeout(() => this.router.navigate(['/secure/tabs/job-search']), 600);
    } catch (e: any) {
      this.error.set(e?.error?.message ?? 'Could not apply for this job.');
    } finally {
      this.applying.set(false);
    }
  }
}
