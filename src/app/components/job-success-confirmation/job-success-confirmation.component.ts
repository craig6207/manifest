import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  IonContent,
  IonButton,
  IonIcon,
  IonSkeletonText,
  IonImg,
  IonToolbar,
  IonButtons,
} from '@ionic/angular/standalone';
import { ModalController, NavController } from '@ionic/angular';
import { DatePipe } from '@angular/common';
import { addIcons } from 'ionicons';
import {
  closeOutline,
  locationOutline,
  cashOutline,
  businessOutline,
  briefcaseOutline,
  calendarClearOutline,
  arrowBack,
} from 'ionicons/icons';

import { ProfileStore } from 'src/app/+state/profile-signal.store';
import { CandidateProfile } from 'src/app/interfaces/candidate-profile';
import { JobListingsService } from 'src/app/services/job-listings/job-listings.service';
import { JobListingView } from 'src/app/interfaces/job-listing';
import { Notification } from 'src/app/interfaces/notification';

@Component({
  selector: 'app-job-success-confirmation',
  standalone: true,
  imports: [
    IonButtons,
    IonToolbar,
    IonImg,
    IonContent,
    IonButton,
    IonIcon,
    IonSkeletonText,
    DatePipe,
  ],
  templateUrl: './job-success-confirmation.component.html',
  styleUrls: ['./job-success-confirmation.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JobSuccessConfirmationComponent implements OnInit {
  @Input() notification?: Notification;
  @Input() jobListingId?: number | null;

  private modalCtrl = inject(ModalController);
  private profileStore = inject(ProfileStore);
  private jobs = inject(JobListingsService);
  private nav = inject(NavController);

  loading = signal<boolean>(true);
  error = signal<string | null>(null);
  job = signal<JobListingView | null>(null);

  profile = computed<CandidateProfile | null>(() =>
    this.profileStore.profile()
  );

  candidateName = computed(() => {
    const p = this.profile();
    if (!p) return '';
    const first = (p.firstName ?? '').trim();
    const last = (p.lastName ?? '').trim();
    const full = `${first} ${last}`.trim();
    return full || 'You';
  });

  roleTitle = computed(() => {
    const j = this.job();
    if (!j) return '';
    const extra = j as JobListingView & { roleTitle?: string };
    return (
      extra.roleTitle ||
      (j as any).jobTitle ||
      j.tradeSubCategory ||
      j.trade ||
      ''
    );
  });

  jobLocation = computed(() => this.job()?.location ?? '');

  payText = computed(() => {
    const j = this.job();
    if (!j) return '';
    const extra = j as JobListingView & {
      minRate?: number;
      maxRate?: number;
      rateUnit?: string;
      rateText?: string;
    };
    if (extra.rateText) return extra.rateText;
    if (extra.minRate != null && extra.maxRate != null) {
      const unit = extra.rateUnit || '/h';
      return `£${extra.minRate} - £${extra.maxRate}${unit}`;
    }
    const singleRate = (j as any).payRate as number | undefined;
    if (singleRate != null) return `£${singleRate}/h`;
    return '';
  });

  clientName = computed(() => {
    const j = this.job();
    if (!j) return '';
    const extra = j as JobListingView & { clientName?: string };
    return extra.clientName ?? '';
  });

  employmentTypeText = computed(() => {
    const j = this.job();
    if (!j) return 'Full-time';
    const extra = j as JobListingView & { employmentType?: string };
    return extra.employmentType || 'Full-time';
  });

  startDateText = computed(() => this.job()?.startDate ?? '');

  candidateInitials = computed(() => {
    const p = this.profile();
    if (!p) return '';
    const first = (p.firstName ?? '').trim();
    const last = (p.lastName ?? '').trim();
    const fi = first ? first[0].toUpperCase() : '';
    const li = last ? last[0].toUpperCase() : '';
    return `${fi}${li}`.trim();
  });

  clientInitials = computed(() => {
    const name = this.clientName();
    if (!name) return '';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '';
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  });

  constructor() {
    addIcons({
      arrowBack,
      closeOutline,
      locationOutline,
      cashOutline,
      businessOutline,
      calendarClearOutline,
      briefcaseOutline,
    });
  }

  ngOnInit(): void {
    const id = this.jobListingId ?? this.notification?.jobListingId ?? null;
    if (!id) {
      this.error.set('Missing job identifier.');
      this.loading.set(false);
      return;
    }

    this.jobs.getById(id).subscribe({
      next: (j) => {
        this.job.set(j);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load job details.');
        this.loading.set(false);
      },
    });
  }

  goBack() {
    this.modalCtrl.dismiss();
  }
}
