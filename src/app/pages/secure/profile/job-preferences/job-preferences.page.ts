import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  IonHeader,
  IonContent,
  IonFooter,
  IonToolbar,
  IonButton,
  IonIcon,
  IonList,
  IonItem,
  IonInput,
  IonSkeletonText,
  IonChip,
  IonLabel,
  IonRange,
} from '@ionic/angular/standalone';
import { NavController, ModalController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { briefcaseOutline, locationOutline, close } from 'ionicons/icons';
import { ToolbarBackComponent } from 'src/app/components/toolbar-back/toolbar-back.component';
import { ProfileStore } from 'src/app/+state/profile-signal.store';
import { CandidateProfile } from 'src/app/interfaces/candidate-profile';
import { TradesService } from 'src/app/services/trades/trades.service';
import { Trades, TradeSubcategories } from 'src/app/interfaces/trades';
import { TradePickerComponent } from 'src/app/components/trade-picker/trade-picker.component';

type JobPrefsForm = {
  locationName: string;
  radiusMiles: number;
  hourlyRate: number;
  dayRate: number;
};

@Component({
  selector: 'app-job-preferences',
  templateUrl: './job-preferences.page.html',
  styleUrl: './job-preferences.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ModalController],
  imports: [
    IonHeader,
    IonContent,
    IonFooter,
    IonToolbar,
    IonButton,
    IonIcon,
    IonList,
    IonItem,
    IonInput,
    IonSkeletonText,
    IonChip,
    IonLabel,
    IonRange,
    ReactiveFormsModule,
    ToolbarBackComponent,
  ],
})
export class JobPreferencesPage {
  private readonly store = inject(ProfileStore);
  private readonly fb = inject(FormBuilder);
  private readonly navCtrl = inject(NavController);
  private readonly tradesService = inject(TradesService);
  private readonly modalCtrl = inject(ModalController);

  jobPreferences = this.store.profile;
  loading = this.store.loading;

  form: FormGroup;

  trades = signal<Trades[]>([]);
  subcategories = signal<TradeSubcategories[]>([]);
  loadingTrades = signal(false);
  loadingSubs = signal(false);
  private tradesLoaded = signal(false);

  tradeId = signal<number | null>(null);
  subcatIds = signal<number[]>([]);

  selectedTradeName = computed(() => {
    const id = this.tradeId();
    const allTrades = this.trades();
    if (id != null && allTrades.length) {
      const hit = allTrades.find((t) => t.id === id);
      if (hit) return hit.name;
    }
    const v = this.jobPreferences();
    return v?.tradeCategory ?? '';
  });

  selectedSubcatNames = computed(() => {
    const allSubs = this.subcategories();
    const ids = this.subcatIds();
    if (allSubs.length && ids.length) {
      return ids
        .map((id) => allSubs.find((s) => s.id === id)?.name)
        .filter((n): n is string => !!n);
    }
    const v = this.jobPreferences();
    if (!v?.tradeSubcategory) return [];
    return v.tradeSubcategory
      .split(',')
      .map((x) => x.trim())
      .filter((x) => !!x);
  });

  selectedSubcatsLabel = computed(() => {
    const names = this.selectedSubcatNames();
    if (!names.length) return '';
    return names.length <= 2
      ? names.join(', ')
      : `${names.slice(0, 2).join(', ')} +${names.length - 2} more`;
  });

  formatHourly = (v: number) => `£${Math.round(v)}/h`;
  formatDaily = (v: number) => `£${Math.round(v)}/d`;

  constructor() {
    this.form = this.fb.group({
      locationName: ['', Validators.required],
      radiusMiles: [15, [Validators.required, Validators.min(1)]],
      hourlyRate: [30, [Validators.required]],
      dayRate: [300, [Validators.required]],
    });

    addIcons({
      briefcaseOutline,
      locationOutline,
      close,
    });

    const defaultRadius = 15;
    const defaultHourly = 30;
    const defaultDay = 300;

    effect(() => {
      const v = this.jobPreferences();
      if (!v) {
        this.form.reset(
          {
            locationName: '',
            radiusMiles: defaultRadius,
            hourlyRate: defaultHourly,
            dayRate: defaultDay,
          },
          { emitEvent: false }
        );
        this.tradeId.set(null);
        this.subcatIds.set([]);
        this.subcategories.set([]);
        this.form.markAsPristine();
        return;
      }

      const radiusMiles = v.locationRadiusMeters ?? defaultRadius;
      const hourlyRate = v.expectedPay ?? defaultHourly;
      const dayRate = v.expectedDayRate ?? defaultDay;

      this.form.patchValue(
        {
          locationName: v.locationName ?? '',
          radiusMiles,
          hourlyRate,
          dayRate,
        },
        { emitEvent: false }
      );

      const tradeId = v.tradeId ?? null;
      const subIds = v.tradeSubcategoryIds ?? [];
      this.tradeId.set(tradeId);
      this.subcatIds.set(subIds.slice());

      if (tradeId != null) {
        this.ensureTradesLoaded();
        this.loadSubcategories(tradeId);
      }

      this.form.markAsPristine();
    });
  }

  ionViewWillEnter(): void {
    this.store.loadProfile();
    this.ensureTradesLoaded();
    const current = this.jobPreferences();
    if (current?.tradeId) {
      this.loadSubcategories(current.tradeId);
    }
  }

  disableSave(): boolean {
    return this.loading() || this.form.invalid || !this.form.dirty;
  }

  async openModal(mode: 'trade' | 'subcategories'): Promise<void> {
    if (mode === 'trade') {
      this.ensureTradesLoaded();
      const items = this.trades().map((t) => ({ id: t.id, name: t.name }));
      const pre = this.tradeId() != null ? [this.tradeId() as number] : [];
      const modal = await this.modalCtrl.create({
        component: TradePickerComponent,
        componentProps: {
          title: 'Select trade',
          items,
          multi: false,
          preselectedIds: pre,
        },
      });
      await modal.present();
      const { data, role } = await modal.onWillDismiss();
      if (role === 'confirm' && data?.ids) {
        const id = (data.ids[0] as number | undefined) ?? null;
        this.setTrade(id);
      }
      return;
    }

    if (!this.tradeId()) return;
    if (!this.subcategories().length) {
      this.loadSubcategories(this.tradeId()!);
    }

    const items = this.subcategories().map((s) => ({ id: s.id, name: s.name }));
    const pre = this.subcatIds();
    const modal = await this.modalCtrl.create({
      component: TradePickerComponent,
      componentProps: {
        title: 'Select sub-categories',
        items,
        multi: true,
        preselectedIds: pre,
      },
    });
    await modal.present();
    const { data, role } = await modal.onWillDismiss();
    if (role === 'confirm' && data?.ids) {
      this.addSubcategories(data.ids as number[]);
    }
  }

  setTrade(tradeId: number | null): void {
    this.tradeId.set(tradeId);
    this.subcatIds.set([]);
    this.subcategories.set([]);
    if (tradeId != null) {
      this.loadSubcategories(tradeId);
    }
    this.form.markAsDirty();
  }

  addSubcategories(ids: number[]): void {
    this.subcatIds.set(ids.slice());
    this.form.markAsDirty();
  }

  removeSubcategory(id: number): void {
    const next = this.subcatIds().filter((x) => x !== id);
    this.subcatIds.set(next);
    this.form.markAsDirty();
  }

  onSave(): void {
    if (this.disableSave()) {
      if (this.form.invalid) {
        this.form.markAllAsTouched();
      }
      return;
    }

    const current = this.jobPreferences();
    if (!current) return;

    const raw = this.form.getRawValue() as JobPrefsForm;

    const normalisedTradeId = this.tradeId() ?? undefined;
    const tradeSubcategoryIds = this.subcatIds().length
      ? this.subcatIds()
      : undefined;

    const patch: Partial<CandidateProfile> = {
      locationName: raw.locationName,
      locationRadiusMeters: raw.radiusMiles,
      expectedPay: raw.hourlyRate,
      expectedDayRate: raw.dayRate,
      tradeId: normalisedTradeId,
      tradeSubcategoryIds,
      tradeCategory: this.selectedTradeName() || undefined,
      tradeSubcategory: this.selectedSubcatNames().join(', ') || undefined,
    };

    const payload = { ...current, ...patch } as CandidateProfile;
    this.store.updateProfile(payload);
    this.form.markAsPristine();
    this.navCtrl.back();
  }

  private ensureTradesLoaded(): void {
    if (this.tradesLoaded()) {
      this.syncTradeFromProfile();
      return;
    }
    this.loadingTrades.set(true);
    this.tradesService.getTrades().subscribe({
      next: (data) => this.trades.set(data),
      error: () => this.trades.set([]),
      complete: () => {
        this.loadingTrades.set(false);
        this.tradesLoaded.set(true);
        this.syncTradeFromProfile();
      },
    });
  }

  private loadSubcategories(tradeId: number): void {
    this.loadingSubs.set(true);
    this.tradesService.getTradeSubcategories(tradeId).subscribe({
      next: (data) => this.subcategories.set(data),
      error: () => this.subcategories.set([]),
      complete: () => {
        this.loadingSubs.set(false);
        this.syncSubcategoriesFromProfile();
      },
    });
  }

  private syncTradeFromProfile(): void {
    const current = this.jobPreferences();
    if (!current) return;
    if (this.tradeId() != null) return;

    if (current.tradeId != null) {
      this.tradeId.set(current.tradeId);
      this.loadSubcategories(current.tradeId);
      return;
    }

    const name = current.tradeCategory?.trim();
    if (!name) return;

    const allTrades = this.trades();
    if (!allTrades.length) return;

    const hit = allTrades.find(
      (t) => t.name.trim().toLowerCase() === name.toLowerCase()
    );
    if (!hit) return;

    this.tradeId.set(hit.id);
    this.loadSubcategories(hit.id);
  }

  private syncSubcategoriesFromProfile(): void {
    const current = this.jobPreferences();
    if (!current) return;
    if (this.subcatIds().length) return;

    if (current.tradeSubcategoryIds && current.tradeSubcategoryIds.length) {
      this.subcatIds.set(current.tradeSubcategoryIds.slice());
      return;
    }

    const subcatStr = current.tradeSubcategory;
    if (!subcatStr) return;

    const names = subcatStr
      .split(',')
      .map((x) => x.trim())
      .filter((x) => !!x);
    if (!names.length) return;

    const lowerSet = new Set(names.map((n) => n.toLowerCase()));
    const matches = this.subcategories()
      .filter((s) => lowerSet.has(s.name.trim().toLowerCase()))
      .map((s) => s.id);

    if (matches.length) {
      this.subcatIds.set(matches);
    }
  }
}
