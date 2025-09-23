import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnInit,
  computed,
  effect,
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
  IonIcon,
  IonList,
  IonItem,
  IonLabel,
  IonNote,
  IonSkeletonText,
  IonInput,
} from '@ionic/angular/standalone';
import { ModalController } from '@ionic/angular';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  FormControl,
  FormGroup,
} from '@angular/forms';
import { DatePipe } from '@angular/common';
import { addIcons } from 'ionicons';
import { checkmarkCircleOutline, closeOutline } from 'ionicons/icons';

import { ProfileStore } from 'src/app/+state/profile-signal.store';
import { CandidateProfile } from 'src/app/interfaces/candidate-profile';
import { JobListingsService } from 'src/app/services/job-listings/job-listings.service';
import { JobListingView } from 'src/app/interfaces/job-listing';
import {
  CandidateConfirmApplyRequest,
  Notification,
} from 'src/app/interfaces/notification';
import { HttpErrorResponse } from '@angular/common/module.d-CnjH8Dlt';
import { JobPipelineService } from 'src/app/services/job-pipeline/job-pipeline.service';

type SuccessFormModel = {
  bankSortCode: FormControl<string>;
  bankAccountNumber: FormControl<string>;
  niNumber: FormControl<string>;
};

@Component({
  selector: 'app-job-success-confirmation',
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonContent,
    IonIcon,
    IonList,
    IonItem,
    IonLabel,
    IonNote,
    IonSkeletonText,
    IonInput,
    ReactiveFormsModule,
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
  private fb = inject(FormBuilder);
  private profileStore = inject(ProfileStore);
  private jobs = inject(JobListingsService);
  private jobPipelineService = inject(JobPipelineService);

  loading = signal<boolean>(true);
  actioning = signal<boolean>(false);
  error = signal<string | null>(null);
  job = signal<JobListingView | null>(null);

  profile = computed<CandidateProfile | null>(() =>
    this.profileStore.profile()
  );
  candidateName = computed(() => {
    const p = this.profile();
    return p ? `${p.firstName} ${p.lastName}`.trim() : 'You';
  });
  startDateText = computed<string>(() => this.job()?.startDate ?? '');

  form: FormGroup<SuccessFormModel> = this.fb.nonNullable.group({
    bankSortCode: this.fb.nonNullable.control<string>('', {
      validators: [
        Validators.required,
        Validators.pattern(/^\d{2}-?\d{2}-?\d{2}$/),
      ],
    }),
    bankAccountNumber: this.fb.nonNullable.control<string>('', {
      validators: [Validators.required, Validators.pattern(/^\d{8}$/)],
    }),
    niNumber: this.fb.nonNullable.control<string>('', {
      validators: [
        Validators.required,
        Validators.pattern(/^[A-CEGHJ-PR-TW-Z]{2}\d{6}[A-D]$/i),
      ],
    }),
  });

  get f() {
    return this.form.controls;
  }

  needsBank = computed<boolean>(() => {
    const p = this.profile();
    return !p?.bankAccountNumber || !p?.bankSortCode;
  });
  needsNI = computed<boolean>(() => {
    const p = this.profile();
    return !p?.niNumber;
  });
  canSubmit = computed<boolean>(() => this.form.valid && !this.actioning());

  headlineNote = computed<string>(() => {
    const bank = this.needsBank();
    const ni = this.needsNI();
    if (bank && ni)
      return 'Before we lock this in, add your bank details and National Insurance number.';
    if (bank) return 'Before we lock this in, add your bank details.';
    if (ni)
      return 'Before we lock this in, add your National Insurance number.';
    return 'Before we lock this in, please double-check your payment and NI details.';
  });

  paymentCardLead = computed<string>(() =>
    this.needsBank()
      ? 'Please enter your bank details.'
      : "We've pre-filled these from your profile. Please check they're correct."
  );

  niCardLead = computed<string>(() =>
    this.needsNI()
      ? 'Please enter your NI number.'
      : "We've pre-filled this from your profile. Please check it's correct."
  );

  private prefilledOnce = false;

  constructor() {
    addIcons({ closeOutline, checkmarkCircleOutline });

    this.f.niNumber.valueChanges.subscribe((val) => {
      const cleaned = (val ?? '').toUpperCase().replace(/\s+/g, '');
      if (cleaned !== val)
        this.f.niNumber.setValue(cleaned, { emitEvent: false });
    });

    this.f.bankSortCode.valueChanges.subscribe((val) => {
      const digits = (val ?? '').replace(/\D+/g, '').slice(0, 6);
      const pretty = digits.replace(/(\d{2})(\d{2})(\d{0,2})/, (_, a, b, c) =>
        c ? `${a}-${b}-${c}` : digits.length >= 4 ? `${a}-${b}` : `${a}`
      );
      if (pretty !== val)
        this.f.bankSortCode.setValue(pretty, { emitEvent: false });
    });

    this.f.bankAccountNumber.valueChanges.subscribe((val) => {
      const digits = (val ?? '').replace(/\D+/g, '').slice(0, 8);
      if (digits !== val)
        this.f.bankAccountNumber.setValue(digits, { emitEvent: false });
    });

    effect(() => {
      const p = this.profile();
      if (!p || this.prefilledOnce) return;

      const patch: Partial<Record<keyof SuccessFormModel, string | boolean>> =
        {};
      if (!this.f.bankSortCode.dirty && p.bankSortCode)
        patch.bankSortCode = p.bankSortCode;
      if (!this.f.bankAccountNumber.dirty && p.bankAccountNumber)
        patch.bankAccountNumber = p.bankAccountNumber;
      if (!this.f.niNumber.dirty && p.niNumber) patch.niNumber = p.niNumber;

      if (Object.keys(patch).length) {
        this.form.patchValue(patch as any, { emitEvent: false });
        this.prefilledOnce = true;
      }
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

  async confirm(): Promise<void> {
    if (!this.form.valid) {
      this.form.markAllAsTouched();
      return;
    }

    const candidateId = this.profile()?.candidateId ?? null;
    const jobListingId =
      this.jobListingId ?? this.notification?.jobListingId ?? null;

    if (!candidateId || !jobListingId) {
      this.error.set('Missing candidate or job id.');
      return;
    }

    this.actioning.set(true);

    const req: CandidateConfirmApplyRequest = {
      jobListingId,
      candidateId,
      bankSortCode: this.f.bankSortCode.value,
      bankAccountNumber: this.f.bankAccountNumber.value,
      niNumber: this.f.niNumber.value,
    };

    this.jobPipelineService.confirmApply(req).subscribe({
      next: async () => {
        const p = this.profile();
        if (p) {
          this.profileStore.setProfile({
            ...p,
            bankSortCode: req.bankSortCode,
            bankAccountNumber: req.bankAccountNumber,
            niNumber: req.niNumber,
          });
        }

        this.actioning.set(false);
        await this.modalCtrl.dismiss({
          action: 'confirmDetails',
          refresh: true,
        });
      },
      error: (err: HttpErrorResponse) => {
        console.error(err);
        this.error.set(
          'Sorry, we could not confirm right now. Please try again.'
        );
        this.actioning.set(false);
      },
    });
  }

  async dismiss(): Promise<void> {
    await this.modalCtrl.dismiss();
  }
}
