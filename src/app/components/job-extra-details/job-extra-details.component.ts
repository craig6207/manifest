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
  IonFooter,
  IonIcon,
  IonList,
  IonItem,
  IonLabel,
  IonNote,
  IonSkeletonText,
} from '@ionic/angular/standalone';
import { ModalController, AlertController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { closeOutline } from 'ionicons/icons';
import { Notification } from 'src/app/interfaces/notification';
import { ProfileStore } from 'src/app/+state/profile-signal.store';
import { JobPlacementDetailsService } from 'src/app/services/job-placement/job-placement.service';
import { JobPlacementDetails } from 'src/app/interfaces/job-details';
import { JobPipelineService } from 'src/app/services/job-pipeline/job-pipeline.service';

@Component({
  selector: 'app-job-extra-details',
  standalone: true,
  imports: [
    IonIcon,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonContent,
    IonFooter,
    IonList,
    IonItem,
    IonLabel,
    IonNote,
    IonSkeletonText,
  ],
  templateUrl: './job-extra-details.component.html',
  styleUrls: ['./job-extra-details.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JobExtraDetailsComponent {
  private modalCtrl = inject(ModalController);
  private alertCtrl = inject(AlertController);
  private profileStore = inject(ProfileStore);
  private jobPlacementService = inject(JobPlacementDetailsService);
  private pipeline = inject(JobPipelineService);

  @Input() notification!: Notification;
  @Input() jobListingId?: number;

  loading = signal<boolean>(true);
  error = signal<string | null>(null);
  details = signal<JobPlacementDetails | null>(null);
  actioning = signal<boolean>(false);

  title = computed(() => 'Site details');

  addressLine = computed(() => {
    const a = this.details()?.siteAddress;
    if (!a) return '';
    const parts = [a.line1, a.line2, a.city, a.postcode]
      .filter(Boolean)
      .map((v) => (v ?? '').toString().trim())
      .filter((v) => v.length > 0);
    return parts.join(', ');
  });

  hoursText = computed(() => {
    const h = this.details()?.hours;
    if (!h?.start || !h?.end) return '';
    const br =
      h.breakMins && h.breakMins > 0 ? ` · ${h.breakMins} min break` : '';
    return `${h.start}–${h.end}${br}`;
  });

  ppeChips = computed(() => {
    const p = this.details()?.ppe;
    if (!p) return [];
    const chips: string[] = [];
    if (p.hardHat) chips.push('Hard hat');
    if (p.hiVis) chips.push('Hi-vis');
    if (p.safetyBoots) chips.push('Safety boots');
    if (p.gloves) chips.push('Gloves');
    if (p.eyeProtection) chips.push('Eye protection');
    if (p.earProtection) chips.push('Ear protection');
    if (p.harness) chips.push('Harness');
    if ((p.other ?? '').trim()) chips.push(`Other: ${p.other!.trim()}`);
    return chips;
  });

  constructor() {
    addIcons({ closeOutline });
  }

  ionViewWillEnter() {
    this.bootstrap();
  }

  private bootstrap() {
    this.loading.set(true);
    this.error.set(null);

    const jobId = this.jobListingId ?? this.notification?.jobListingId ?? null;
    const candidateId = this.profileStore.profile()?.candidateId ?? null;

    if (!jobId || !candidateId) {
      this.error.set('Missing identifiers to load site details.');
      this.loading.set(false);
      return;
    }

    this.jobPlacementService
      .getForJobAndCandidate(jobId, candidateId)
      .subscribe({
        next: (d) => {
          this.details.set(d);
          this.loading.set(false);
        },
        error: (e) => {
          console.error(e);
          this.error.set('Could not load site details.');
          this.loading.set(false);
        },
      });
  }

  async confirm() {
    const alert = await this.alertCtrl.create({
      header: 'Confirm application?',
      message:
        "You're confirming you want to fully apply for this job. The client will review and confirm if you are starting on the start date.",
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Confirm',
          role: 'confirm',
          handler: () => this.finish('accept'),
        },
      ],
    });
    await alert.present();
  }

  async decline() {
    const alert = await this.alertCtrl.create({
      header: 'Decline this job?',
      message: 'Are you sure you no longer want to be considered for this job?',
      buttons: [
        { text: 'Keep me in', role: 'cancel' },
        {
          text: 'Decline',
          role: 'destructive',
          handler: () => this.finish('decline'),
        },
      ],
    });
    await alert.present();
  }

  private finish(action: 'accept' | 'decline') {
    const jobId = this.jobListingId ?? this.notification?.jobListingId ?? null;
    const candidateId = this.profileStore.profile()?.candidateId ?? null;

    if (!jobId || !candidateId) {
      this.error.set('Missing identifiers to submit your decision.');
      return;
    }

    this.actioning.set(true);
    this.pipeline
      .respondToPlacement({ jobListingId: jobId, candidateId, action })
      .subscribe({
        next: () => this.modalCtrl.dismiss({ action, refresh: true }),
        error: (e) => {
          console.error(e);
          this.actioning.set(false);
          this.error.set('Failed to submit your decision. Please try again.');
        },
      });
  }

  async dismiss() {
    await this.modalCtrl.dismiss();
  }
}
