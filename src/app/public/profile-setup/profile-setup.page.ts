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
} from '@ionic/angular/standalone';
import { Geolocation } from '@capacitor/geolocation';
import { addIcons } from 'ionicons';
import { close } from 'ionicons/icons';

@Component({
  selector: 'app-profile-setup',
  templateUrl: './profile-setup.page.html',
  styleUrls: ['./profile-setup.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonButtons,
    ReactiveFormsModule,
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
  ],
})
export class ProfileSetupPage implements OnInit {
  constructor() {
    addIcons({
      close,
    });
  }
  private readonly fb = inject(FormBuilder);
  currentStep = signal(1);
  readonly totalSteps = 3;

  personalForm!: FormGroup;
  locationForm!: FormGroup;
  bankForm!: FormGroup;

  tradeCategoryOptions = ['Electrician', 'Plumber', 'Joiner', 'Bricklayer'];
  subcategoryOptions = ['Domestic', 'Commercial', 'Site Work'];

  readonly progress = computed(() => this.currentStep() / this.totalSteps);

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
      radius: [20, Validators.required],
      payRate: [25, Validators.required],
      tradeCategories: [[], Validators.required],
      tradeSubcategories: [[], Validators.required],
      certificates: [''],
    });

    this.bankForm = this.fb.group({
      bankAccount: ['', [Validators.required, Validators.pattern(/^\d{8}$/)]],
      sortCode: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
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
      console.log(permissionStatus);
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

  submit(): void {
    if (this.bankForm.invalid) {
      this.bankForm.markAllAsTouched();
      return;
    }

    const profileData = {
      ...this.personalForm.value,
      ...this.locationForm.value,
      ...this.bankForm.value,
    };

    console.log('Profile submitted:', profileData);
  }

  private markCurrentStepTouched(): void {
    if (this.currentStep() === 1) {
      this.personalForm.markAllAsTouched();
    } else if (this.currentStep() === 2) {
      this.locationForm.markAllAsTouched();
    }
  }

  pinFormatter(value: number) {
    return `£${value} p/h`;
  }
}
