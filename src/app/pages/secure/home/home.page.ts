import { Component, computed, inject, signal } from '@angular/core';
import { NavController } from '@ionic/angular';
import {
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardContent,
  IonButton,
  IonSkeletonText,
  IonIcon,
} from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { addIcons } from 'ionicons';
import {
  heartOutline,
  locationOutline,
  briefcaseOutline,
  timeOutline,
  arrowForwardOutline,
} from 'ionicons/icons';
import { ToolbarHomeComponent } from 'src/app/components/toolbar-home/toolbar-home.component';
import { ProfileStore } from 'src/app/+state/profile-signal.store';
import { JobListingsService } from 'src/app/services/job-listings/job-listings.service';
import { JobFilterOptions, JobListing } from 'src/app/interfaces/job-listing';
import { JobActivityService } from 'src/app/services/job-activity/job-activity.service';
import { JobActivitySummary } from 'src/app/interfaces/candidate-jobs';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardContent,
    IonButton,
    IonSkeletonText,
    IonIcon,
    ToolbarHomeComponent,
    DatePipe,
  ],
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
})
export class HomePage {
  private profileStore = inject(ProfileStore);
  private jobListingsService = inject(JobListingsService);
  private jobActivityService = inject(JobActivityService);
  private router = inject(Router);
  private nav = inject(NavController);

  readonly jobs = signal<JobListing[]>([]);
  readonly jobsLoaded = signal(false);

  readonly activitySummary = signal<JobActivitySummary | null>(null);
  readonly activityLoading = signal(true);

  readonly profileReady = computed(() => !!this.profileStore.profile());
  readonly unreadCount = computed(() =>
    this.profileStore.unreadNotificationCount()
  );

  readonly isLoading = computed(
    () => !this.profileReady() || !this.jobsLoaded()
  );

  readonly firstName = computed(() => {
    const profile = this.profileStore.profile();
    const name = (profile?.firstName ?? 'there').trim();
    return name.length ? name : 'there';
  });

  readonly bookedCount = computed(() => this.activitySummary()?.booked ?? 0);
  readonly offeredCount = computed(() => this.activitySummary()?.offered ?? 0);
  readonly appliedCount = computed(() => this.activitySummary()?.applied ?? 0);

  constructor() {
    addIcons({
      heartOutline,
      locationOutline,
      briefcaseOutline,
      timeOutline,
      arrowForwardOutline,
    });

    this.loadJobs();
    this.loadActivitySummary();
  }

  private loadJobs(): void {
    const profile = this.profileStore.profile();
    const userId = (profile as any)?.userId;

    if (!userId) {
      this.jobs.set([]);
      this.jobsLoaded.set(true);
      return;
    }

    const opts: JobFilterOptions = {
      skip: 0,
      take: 3,
      includePast: false,
    };

    this.jobListingsService.getForCandidate(userId, opts).subscribe({
      next: (jobs) => {
        this.jobs.set(jobs ?? []);
        this.jobsLoaded.set(true);
      },
      error: () => {
        this.jobs.set([]);
        this.jobsLoaded.set(true);
      },
    });
  }

  private loadActivitySummary(): void {
    this.activityLoading.set(true);

    this.jobActivityService.getMySummary().subscribe({
      next: (summary) => {
        this.activitySummary.set(summary);
        this.activityLoading.set(false);
      },
      error: () => {
        this.activitySummary.set({ booked: 0, offered: 0, applied: 0 });
        this.activityLoading.set(false);
      },
    });
  }

  goBrowse(): void {
    this.router.navigate(['/secure/tabs/job-search']);
  }

  goToJob(job: JobListing): void {
    this.nav.navigateForward(['secure/tabs/job-detail', job.id], {
      state: { job },
    });
  }
}
