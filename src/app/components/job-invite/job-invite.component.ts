import {
  ChangeDetectionStrategy,
  Component,
  Input,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonSkeletonText,
  IonFooter,
  IonBadge,
  IonIcon,
} from '@ionic/angular/standalone';
import { DatePipe } from '@angular/common';
import { ModalController } from '@ionic/angular';
import { JobListingsService } from 'src/app/services/job-listings/job-listings.service';
import { addIcons } from 'ionicons';
import { closeOutline } from 'ionicons/icons';
import { Notification } from 'src/app/interfaces/notification';
import { JobListingView } from 'src/app/interfaces/job-listing';
import { JobPipelineService } from 'src/app/services/job-pipeline/job-pipeline.service';
import { ProfileStore } from 'src/app/+state/profile-signal.store';

@Component({
  selector: 'app-job-invite',
  standalone: true,
  imports: [
    IonIcon,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonContent,
    IonSkeletonText,
    IonFooter,
    IonBadge,
    DatePipe,
  ],
  templateUrl: './job-invite.component.html',
  styleUrls: ['./job-invite.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JobInviteComponent {
  private modalCtrl = inject(ModalController);
  private jobs = inject(JobListingsService);
  private pipeline = inject(JobPipelineService);
  private profileStore = inject(ProfileStore);

  @Input() notification!: Notification;
  @Input() jobListingId?: number;

  loading = signal(true);
  actioning = signal(false);
  error = signal<string | null>(null);
  job = signal<JobListingView | null>(null);

  jobTitle = computed(() => {
    const j = this.job();
    if (!j) return '';
    return j.tradeSubCategory?.trim() || j.trade?.trim() || 'Job';
  });
  clientName = computed(() => this.job()?.clientName ?? '');
  locationText = computed(() => this.job()?.location?.trim() || 'TBC');
  startDateText = computed(() => this.job()?.startDate ?? '');
  endDateText = computed(() => this.job()?.endDate ?? '');
  hasDates = computed(() => !!(this.job()?.startDate || this.job()?.endDate));
  hours = computed<string[]>(() => {
    const h = this.job()?.hours;
    if (!h) return [];
    return Array.isArray(h) ? h : [String(h)];
  });
  payText = computed(() => {
    const rate = this.job()?.payRate;
    return typeof rate === 'number' && rate > 0 ? `£${rate}/hr` : 'Market rate';
  });

  constructor() {
    addIcons({ closeOutline });
  }

  ionViewWillEnter() {
    this.fetchJob();
  }

  private fetchJob() {
    this.loading.set(true);
    this.error.set(null);

    const id = this.jobListingId || this.notification.jobListingId!;
    this.jobs.getById(id).subscribe({
      next: (j) => {
        this.job.set(j);
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set('Failed to load job details.');
        this.loading.set(false);
      },
    });
  }

  accept() {
    this.doAction('accept');
  }

  decline() {
    this.doAction('decline');
  }

  private doAction(action: 'accept' | 'decline') {
    const candidateId = this.profileStore.profile()?.candidateId;
    const jobId = this.jobListingId || this.notification.jobListingId!;
    if (!candidateId || !jobId) {
      this.error.set('Missing candidate or job id.');
      return;
    }

    this.actioning.set(true);

    this.pipeline
      .respondToInvite({ jobListingId: jobId, candidateId, action })
      .subscribe({
        next: () => this.dismiss({ action }),
        error: (e) => {
          this.actioning.set(false);
          this.error.set('Failed to submit response.');
        },
      });
  }

  async dismiss(data?: any) {
    await this.modalCtrl.dismiss(data);
  }
}
