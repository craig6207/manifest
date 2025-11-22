import { Component, computed, inject, signal } from '@angular/core';
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
import { JobListing } from 'src/app/interfaces/job-listing';

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
  ],
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
})
export class HomePage {
  private profileStore = inject(ProfileStore);
  private jobListingsService = inject(JobListingsService);
  private router = inject(Router);

  readonly jobs = signal<JobListing[]>([]);
  readonly jobsLoaded = signal(false);

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

  constructor() {
    addIcons({
      heartOutline,
      locationOutline,
      briefcaseOutline,
      timeOutline,
      arrowForwardOutline,
    });

    const profile = this.profileStore.profile();
    const candidateProfileId =
      (profile as any)?.candidateProfileId ?? (profile as any)?.id;

    if (!candidateProfileId) {
      this.jobsLoaded.set(true);
      return;
    }

    this.jobListingsService
      .getForCandidate(candidateProfileId, {
        skip: 0,
        take: 2,
        includePast: false,
      })
      .subscribe({
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

  goBrowse(): void {
    this.router.navigate(['/secure/tabs/job-search']);
  }

  goToJob(jobId: number): void {
    this.router.navigate(['/secure/tabs/job-search', jobId]);
  }
}
