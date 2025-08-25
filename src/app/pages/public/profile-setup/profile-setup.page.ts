import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  signal,
  computed,
  inject,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import {
  IonButton,
  IonInput,
  IonRange,
  IonSelect,
  IonSelectOption,
  IonProgressBar,
  IonList,
  IonItem,
  IonLabel,
  IonHeader,
  IonToolbar,
  IonContent,
  IonTitle,
  IonIcon,
  IonButtons,
  IonAlert,
  IonFooter,
  IonNote,
} from '@ionic/angular/standalone';
import { Geolocation } from '@capacitor/geolocation';
import { addIcons } from 'ionicons';
import { close } from 'ionicons/icons';
import { UserProfile } from 'src/app/interfaces/user-profile';
import { UserProfileService } from 'src/app/services/user-profile/user-profile.service';
import { LoadingController } from '@ionic/angular';
import { Router } from '@angular/router';
import { ProfileStore } from 'src/app/+state/profile-signal.store';
import { RegisterStore } from 'src/app/+state/register-signal.store';

@Component({
  selector: 'app-profile-setup',
  templateUrl: './profile-setup.page.html',
  styleUrls: ['./profile-setup.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonNote,
    IonFooter,
    IonAlert,
    IonButtons,
    ReactiveFormsModule,
    IonButton,
    IonInput,
    IonRange,
    IonSelect,
    IonSelectOption,
    IonList,
    IonItem,
    IonLabel,
    IonHeader,
    IonToolbar,
    IonContent,
    IonTitle,
    IonIcon,
  ],
})
export class ProfileSetupPage implements OnInit {
  constructor() {
    addIcons({
      close,
    });
  }
  private readonly fb = inject(FormBuilder);
  private readonly profileService = inject(UserProfileService);
  private loadingCtrl = inject(LoadingController);
  private router = inject(Router);
  private profileStore = inject(ProfileStore);
  private registerStore = inject(RegisterStore);
  currentStep = signal(1);
  readonly totalSteps = 3;
  toastOption = { color: '', message: '', show: false };
  personalForm!: FormGroup;
  locationForm!: FormGroup;
  bankForm!: FormGroup;

  tradeCategoryOptions = ['Electrician', 'Plumber', 'Joiner', 'Bricklayer'];
  subcategoryOptions = ['Domestic', 'Commercial', 'Site Work'];

  readonly progress = computed(() => {
    const step = Math.max(1, Math.min(this.totalSteps, this.currentStep()));
    const denom = Math.max(1, this.totalSteps - 1);
    return (step - 1) / denom;
  });

  public alertButtons = [
    {
      text: 'Cancel',
      role: 'cancel',
      handler: () => {},
    },
    {
      text: 'OK',
      role: 'confirm',
      handler: () => {
        this.router.navigate(['/']);
      },
    },
  ];

  ngOnInit(): void {
    this.personalForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      phoneNumber: [
        '',
        [Validators.required, Validators.pattern(/^\+?\d{10,}$/)],
      ],
      sex: ['', Validators.required],
    });

    this.locationForm = this.fb.group({
      location: ['Edinburgh', Validators.required],
      locationRadius: [20, Validators.required],
      expectedPay: [25, Validators.required],
      tradeCategory: ['', Validators.required],
      tradeSubcategory: ['', Validators.required],
    });

    this.bankForm = this.fb.group({
      bankAccountNumber: [
        '',
        [Validators.required, Validators.pattern(/^\d{8}$/)],
      ],
      bankSortCode: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
      niNumber: [
        '',
        [
          Validators.required,
          Validators.pattern(/^[A-CEGHJ-PR-TW-Z]{2}\d{6}[A-D]$/i),
        ],
      ],
    });

    this.getUserLocation();
  }

  async getUserLocation(): Promise<void> {
    try {
      const permissionStatus = await Geolocation.requestPermissions();
      if (permissionStatus.location !== 'granted') {
        console.warn('Location permission not granted.');
        return;
      }

      const position = await Geolocation.getCurrentPosition();
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;

      console.log(`Latitude: ${lat}, Longitude: ${lng}`);
    } catch (error) {
      console.warn('Error getting location:', error);
    }
  }

  next(): void {
    if (
      (this.currentStep() === 1 && this.personalForm.invalid) ||
      (this.currentStep() === 2 && this.locationForm.invalid)
    ) {
      this.markCurrentStepTouched();
      return;
    }

    if (this.currentStep() < this.totalSteps) {
      this.currentStep.update((s) => s + 1);
    }
  }

  back(): void {
    if (this.currentStep() > 1) {
      this.currentStep.update((s) => s - 1);
    }
  }

  async submit() {
    if (this.bankForm.invalid) {
      this.bankForm.markAllAsTouched();
      return;
    }

    const profileData: UserProfile = {
      userId: this.registerStore.userId(),
      ...this.personalForm.value,
      ...this.locationForm.value,
      ...this.bankForm.value,
    };

    const loading = await this.loadingCtrl.create({
      message: 'Loading...',
    });
    await loading.present();

    this.profileService.saveProfile(profileData).subscribe({
      next: async () => {
        await loading.dismiss();
        this.profileStore.setProfile(profileData);
        this.router.navigate(['/secure']);
      },
      error: async () => {
        await loading.dismiss();
        this.profileStore.setProfile(profileData);
        this.toastOption = {
          color: 'danger',
          message:
            'Failed to save profile. Next time you login you may have to fill in your profile details again',
          show: true,
        };
        this.router.navigate(['/secure']);
      },
    });
  }

  private markCurrentStepTouched(): void {
    if (this.currentStep() === 1) {
      this.personalForm.markAllAsTouched();
    } else if (this.currentStep() === 2) {
      this.locationForm.markAllAsTouched();
    }
  }
}
