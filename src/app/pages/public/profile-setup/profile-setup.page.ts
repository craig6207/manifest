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
import { addIcons } from 'ionicons';
import { close } from 'ionicons/icons';
import { CandidateProfile } from 'src/app/interfaces/candidate-profile';
import { CandidateProfileService } from 'src/app/services/candidate-profile/candidate-profile.service';
import { LoadingController } from '@ionic/angular';
import { Router } from '@angular/router';
import { ProfileStore } from 'src/app/+state/profile-signal.store';
import { RegisterStore } from 'src/app/+state/register-signal.store';
import { LocationPickerComponent } from 'src/app/components/location-picker/location-picker/location-picker.component';
import { TradesService } from 'src/app/services/trades/trades.service';
import { Trades, TradeSubcategories } from 'src/app/interfaces/trades';
type LocationSelection = {
  placeName: string;
  lat: number;
  lng: number;
  radiusMiles: number;
  radiusMeters: number;
};
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
    LocationPickerComponent,
  ],
})
export class ProfileSetupPage implements OnInit {
  constructor() {
    addIcons({ close });
  }
  private readonly fb = inject(FormBuilder);
  private readonly profileService = inject(CandidateProfileService);
  private readonly loadingCtrl = inject(LoadingController);
  private readonly router = inject(Router);
  private readonly profileStore = inject(ProfileStore);
  private readonly registerStore = inject(RegisterStore);
  private tradesService = inject(TradesService);
  currentStep = signal(1);
  trades = signal<Trades[]>([]);
  subcategories = signal<TradeSubcategories[]>([]);
  loadingTrades = signal<boolean>(false);
  loadingSubs = signal<boolean>(false);
  readonly totalSteps = 4;
  personalForm!: FormGroup;
  payTradeForm!: FormGroup;
  bankForm!: FormGroup;
  private locationSel = signal<LocationSelection | null>(null);
  locationSelected = computed(() => !!this.locationSel());
  toastOption = { color: '', message: '', show: false };
  readonly progress = computed(() => {
    const step = Math.max(1, Math.min(this.totalSteps, this.currentStep()));
    const denom = Math.max(1, this.totalSteps - 1);
    return (step - 1) / denom;
  });
  public alertButtons = [
    { text: 'Cancel', role: 'cancel', handler: () => {} },
    { text: 'OK', role: 'confirm', handler: () => this.router.navigate(['/']) },
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
    this.payTradeForm = this.fb.group({
      expectedPay: [25, Validators.required],
      tradeId: [null, Validators.required],
      tradeSubcategoryId: [null, Validators.required],
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
    this.loadTrades();
    this.payTradeForm
      .get('tradeId')!
      .valueChanges.subscribe((id: number | null) => {
        this.payTradeForm.get('tradeSubcategoryId')!.setValue(null);
        this.subcategories.set([]);
        if (id != null) this.loadSubcategories(id);
      });
  }
  onLocationSelected(sel: LocationSelection) {
    this.locationSel.set(sel);
  }
  next(): void {
    const s = this.currentStep();
    if (s === 1 && this.personalForm.invalid) {
      this.personalForm.markAllAsTouched();
      return;
    }
    if (s === 2 && !this.locationSel()) {
      return;
    }
    if (s === 3 && this.payTradeForm.invalid) {
      this.payTradeForm.markAllAsTouched();
      return;
    }
    if (s < this.totalSteps) this.currentStep.set(s + 1);
  }
  back(): void {
    if (this.currentStep() > 1) this.currentStep.update((v) => v - 1);
  }
  private loadTrades() {
    this.loadingTrades.set(true);
    this.tradesService
      .getTrades()
      .subscribe({
        next: (data) => this.trades.set(data),
        error: () => this.trades.set([]),
        complete: () => this.loadingTrades.set(false),
      });
  }
  private loadSubcategories(tradeId: number) {
    this.loadingSubs.set(true);
    this.tradesService
      .getTradeSubcategories(tradeId)
      .subscribe({
        next: (data) => this.subcategories.set(data),
        error: () => this.subcategories.set([]),
        complete: () => this.loadingSubs.set(false),
      });
  }
  async submit() {
    if (this.bankForm.invalid || !this.locationSel()) {
      this.bankForm.markAllAsTouched();
      return;
    }
    const tradeId = this.payTradeForm.value.tradeId as number;
    const subId = this.payTradeForm.value.tradeSubcategoryId as number;
    const tradeName = this.trades().find((t) => t.id === tradeId)?.name ?? '';
    const subName =
      this.subcategories().find((s) => s.id === subId)?.name ?? '';
    const loc = this.locationSel()!;
    const profileData: CandidateProfile = {
      userId: this.registerStore.userId(),
      ...this.personalForm.value,
      locationName: loc.placeName || 'Custom',
      locationLat: loc.lat,
      locationLng: loc.lng,
      locationRadiusMeters: loc.radiusMeters,
      location: loc.placeName || 'Custom',
      locationRadius: loc.radiusMiles,
      expectedPay: this.payTradeForm.value.expectedPay,
      tradeCategory: tradeName,
      tradeSubcategory: subName,
      ...this.bankForm.value,
      rating: 0,
    } as CandidateProfile;
    const loading = await this.loadingCtrl.create({ message: 'Loading...' });
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
}
