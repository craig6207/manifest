import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  signal,
  computed,
  inject,
  ViewChild,
  ChangeDetectorRef,
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
  IonList,
  IonItem,
  IonLabel,
  IonHeader,
  IonToolbar,
  IonContent,
  IonTitle,
  IonIcon,
  IonButtons,
  IonFooter,
  IonNote,
  IonSelect,
  IonSelectOption,
  IonChip,
  ModalController,
  AlertController,
  LoadingController,
  IonText,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { close, locate } from 'ionicons/icons';
import { CandidateProfile } from 'src/app/interfaces/candidate-profile';
import { CandidateProfileService } from 'src/app/services/candidate-profile/candidate-profile.service';
import { Router } from '@angular/router';
import { ProfileStore } from 'src/app/+state/profile-signal.store';
import { RegisterStore } from 'src/app/+state/register-signal.store';
import { LocationPickerComponent } from 'src/app/components/location-picker/location-picker/location-picker.component';
import { TradesService } from 'src/app/services/trades/trades.service';
import { Trades, TradeSubcategories } from 'src/app/interfaces/trades';
import { TradePickerComponent } from 'src/app/components/trade-picker/trade-picker.component';

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
  providers: [ModalController],
  imports: [
    IonText,
    ReactiveFormsModule,
    IonNote,
    IonFooter,
    IonButtons,
    IonButton,
    IonInput,
    IonRange,
    IonList,
    IonItem,
    IonLabel,
    IonHeader,
    IonToolbar,
    IonContent,
    IonTitle,
    IonIcon,
    IonSelect,
    IonSelectOption,
    LocationPickerComponent,
  ],
})
export class ProfileSetupPage implements OnInit {
  @ViewChild(LocationPickerComponent)
  private locationPicker?: LocationPickerComponent;

  constructor(
    private modalController: ModalController,
    private loadingController: LoadingController,
    private alertController: AlertController
  ) {
    addIcons({ close, locate });
  }

  private readonly fb = inject(FormBuilder);
  private readonly profileService = inject(CandidateProfileService);
  private readonly router = inject(Router);
  private readonly profileStore = inject(ProfileStore);
  private readonly registerStore = inject(RegisterStore);
  private readonly tradesService = inject(TradesService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly totalSteps = 4;
  personalForm!: FormGroup;
  payTradeForm!: FormGroup;
  bankForm!: FormGroup;

  currentStep = signal(1);
  trades = signal<Trades[]>([]);
  subcategories = signal<TradeSubcategories[]>([]);
  loadingTrades = signal(false);
  loadingSubs = signal(false);

  private locationSel = signal<LocationSelection | null>(null);
  locationSelected = computed(() => !!this.locationSel());
  selectedRadiusMiles = computed(() => this.locationSel()?.radiusMiles ?? 15);
  readonly progress = computed(() => {
    const step = Math.max(1, Math.min(this.totalSteps, this.currentStep()));
    const denom = Math.max(1, this.totalSteps - 1);
    return (step - 1) / denom;
  });

  selectedTradeName(): string {
    const id = this.payTradeForm?.get('tradeId')?.value as number | null;
    if (id == null) return '';
    return this.trades().find((t) => t.id === id)?.name ?? '';
  }

  selectedSubcatNames(): string[] {
    const ids =
      (this.payTradeForm?.get('tradeSubcategoryIds')?.value as number[]) ?? [];
    if (!ids.length) return [];
    return ids
      .map((id) => this.subcategories().find((s) => s.id === id)?.name)
      .filter((n): n is string => !!n);
  }

  selectedSubcatsLabel(): string {
    const names = this.selectedSubcatNames();
    if (!names.length) return 'Choose';
    return names.length <= 2
      ? names.join(', ')
      : `${names.slice(0, 2).join(', ')} +${names.length - 2} more`;
  }

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
      tradeSubcategoryIds: this.fb.control<number[]>([], { nonNullable: true }),
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
        this.payTradeForm
          .get('tradeSubcategoryIds')!
          .setValue([], { emitEvent: false });
        this.subcategories.set([]);
        if (id != null) this.loadSubcategories(id);
        this.cdr.markForCheck();
      });
  }

  onLocationSelected(sel: LocationSelection) {
    this.locationSel.set(sel);
  }
  onOpenRadiusClick(): void {
    this.locationPicker?.openRadiusSheet();
  }
  onUseMyLocationClick(): void {
    this.locationPicker?.useMyLocation();
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
    this.tradesService.getTrades().subscribe({
      next: (data) => this.trades.set(data),
      error: () => this.trades.set([]),
      complete: () => {
        this.loadingTrades.set(false);
        this.cdr.markForCheck();
      },
    });
  }
  private loadSubcategories(tradeId: number) {
    this.loadingSubs.set(true);
    this.tradesService.getTradeSubcategories(tradeId).subscribe({
      next: (data) => this.subcategories.set(data),
      error: () => this.subcategories.set([]),
      complete: () => {
        this.loadingSubs.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  async openModal(mode: 'trade' | 'subcategories') {
    const items =
      mode === 'trade'
        ? this.trades().map((t) => ({ id: t.id, name: t.name }))
        : this.subcategories().map((s) => ({ id: s.id, name: s.name }));

    const pre =
      mode === 'trade'
        ? this.payTradeForm.value.tradeId != null
          ? [this.payTradeForm.value.tradeId]
          : []
        : this.payTradeForm.value.tradeSubcategoryIds ?? [];

    const modal = await this.modalController.create({
      component: TradePickerComponent,
      componentProps: {
        title: mode === 'trade' ? 'Select trade' : 'Select sub-categories',
        items,
        multi: mode === 'subcategories',
        preselectedIds: pre,
      },
    });

    await modal.present();
    const { data, role } = await modal.onWillDismiss();

    if (role === 'confirm' && data?.ids) {
      if (mode === 'trade') {
        const id = (data.ids[0] as number | undefined) ?? null;
        this.payTradeForm.get('tradeId')!.setValue(id);
        this.payTradeForm
          .get('tradeSubcategoryIds')!
          .setValue([], { emitEvent: false });
        this.subcategories.set([]);
        if (id != null) this.loadSubcategories(id);
      } else {
        this.payTradeForm
          .get('tradeSubcategoryIds')!
          .setValue(data.ids as number[]);
      }
      this.cdr.markForCheck();
    }
  }

  async presentExitAlert(): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Leave profile setup?',
      message:
        'You cannot access the app until you complete the profile setup. You can finish it next time you log in. Still want to leave?',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'OK',
          role: 'confirm',
          handler: () => this.router.navigate(['/']),
        },
      ],
    });
    await alert.present();
  }

  async submit() {
    if (this.bankForm.invalid || !this.locationSel()) {
      this.bankForm.markAllAsTouched();
      return;
    }

    const tradeId = this.payTradeForm.value.tradeId as number;
    const tradeName = this.trades().find((t) => t.id === tradeId)?.name ?? '';

    const subIds = this.payTradeForm.value.tradeSubcategoryIds as number[];
    const subNames = subIds
      .map((id) => this.subcategories().find((s) => s.id === id)?.name)
      .filter((n): n is string => !!n);
    const subNameJoined = subNames.join(', ');

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
      tradeSubcategory: subNameJoined,
      ...this.bankForm.value,
      rating: 0,
    } as CandidateProfile;

    const loading = await this.loadingController.create({
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
        this.router.navigate(['/secure']);
      },
    });
  }
}
