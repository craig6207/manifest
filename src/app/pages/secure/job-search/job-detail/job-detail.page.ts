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
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonTitle,
  IonContent,
  IonIcon,
  IonChip,
  IonButton,
  IonFooter,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  informationCircleOutline,
  briefcaseOutline,
  locationOutline,
  cashOutline,
  calendarOutline,
  timeOutline,
  shieldCheckmarkOutline,
} from 'ionicons/icons';
import { DatePipe } from '@angular/common';
import { JobListing } from 'src/app/interfaces/job-listing';

@Component({
  selector: 'app-job-detail',
  standalone: true,
  imports: [
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonContent,
    IonIcon,
    IonChip,
    IonButton,
    IonFooter,
    DatePipe,
  ],
  templateUrl: './job-detail.page.html',
  styleUrls: ['./job-detail.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JobDetailPage {
  private router = inject(Router);

  constructor() {
    addIcons({
      informationCircleOutline,
      briefcaseOutline,
      locationOutline,
      cashOutline,
      calendarOutline,
      timeOutline,
      shieldCheckmarkOutline,
    });

    const stateJob =
      (this.router.getCurrentNavigation()?.extras?.state as any)?.job ??
      (history.state?.job as JobListing | undefined);

    if (stateJob) {
      this.jobListing.set(stateJob);
    } else {
      // TODO (optional): Fallback load by id when direct-linking/refreshing
      // const id = Number(this.route.snapshot.paramMap.get('id'));
      // this.loadById(id);
    }
  }
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

  applyNow(): void {
    console.log('Apply for', this.jobListing()?.id);
  }
}
